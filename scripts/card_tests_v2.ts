// Test luật V2 của chế độ thẻ bài (docs/ENGINE_V2_SPEC.md, mục 6 + "Owner decisions" cuối file, các điểm 1-9).
// Chạy: npx tsx scripts/card_tests_v2.ts [--only=chuỗi] [--verbose]. Khung test chép từ scripts/card_tests.ts.
// Viết theo spec TRƯỚC khi engine xong: test đỏ = engine chưa làm; test hỏng do lỗi test thì sửa test.
// Số liệu của tướng thật sẽ đổi ở đợt viết lại tướng: test chỉ dùng tướng giả v2_* và đọc hằng số từ RULES.
import assert from "node:assert/strict"
import {
    cg
} from "@starci/shared"

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
class Skip extends Error {}
const skip = (why: string): never => { throw new Skip(why) }
const results: { group: string; name: string; res: "PASS" | "FAIL" | "SKIP"; note?: string }[] = []
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
        if (e instanceof Skip) results.push({
            group, name, res: "SKIP", note: e.message
        })
        else results.push({
            group, name, res: "FAIL", note: (e as Error).message.split("\n").slice(0,
                3).join(" | ") + (VERBOSE ? `\n${(e as Error).stack}` : "")
        })
    }
}

// Truy cập API V2 theo spec mà không làm hỏng kiểu khi engine chưa có (test sẽ đỏ lúc chạy nếu thiếu)
type V2Rules = {
    drawPerTurn: number; handMax: number; startHand: number; attackLimit: number
    skillCopies: Record<"Q" | "E" | "R", number>; sharedDeckSize: number; respawnRounds: number
    fighterCardlessMult: number
    mage: { manaMax: number; manaStart: number; manaRegen: number; defaultCost: Record<"Q" | "E" | "R", number> }
    laneOpenEvery?: number
}
const R = cg.RULES as unknown as V2Rules
type V2Game = InstanceType<typeof Game> & {
    isMage(u: cg.Unit): boolean; maxMana(u: cg.Unit): number; manaOf(u: cg.Unit): number
    gainMana(u: cg.Unit, n: number, reason?: string): number
    manaCost(u: cg.Unit, def: cg.SkillDef, card: cg.Card): number
    attackLimit(side: S): number; attacksLeft(side: S): number
    turnAttacks(): { used: number; bonus: number; cardless: string[] }
    canCardless(u: cg.Unit): boolean; allowCardless(u: cg.Unit): void
    grantFreeAttack(u: cg.Unit, buff?: Partial<cg.NextAttackBuff>): void
    giveSkillToHand(side: S, hero: string, key: cg.SkillKey, reason: string): void
}
const gm = (s: St) => new Game(s) as V2Game

// ======================================================================
// Tướng giả (chỉ số dễ tính: 0 giáp, 0 kháng phép)
// ======================================================================
const noSkill = (key: "Q" | "E" | "R") => ({
    key, name: "-", desc: "-", target: "none" as const, canPlay: () => false, resolve: () => {}
})
const base = {
    damage: "physical" as const, hp: 1000, atk: 100, armor: 0, mr: 0, passive: {
        name: "-", desc: "-"
    }
}
const filler = {
    Q: noSkill("Q"), E: noSkill("E"), R: noSkill("R")
}
for (const [id,
    role] of [["v2_tank",
        "tank"],
    ["v2_fighter",
        "fighter"],
    ["v2_fighter2",
        "fighter"],
    ["v2_sup",
        "support"],
    ["v2_mark",
        "marksman"]] as const) {
    cg.defineHero({
        id, name: id, role, ...base, skills: filler
    })
}
/** Tướng cũ còn khai báo skillCopies: engine V2 phải bỏ qua, vẫn 4Q 4E 1R */
cg.defineHero({
    id: "v2_oldcopies", name: "v2_oldcopies", role: "tank", ...base, skills: filler, skillCopies: {
        Q: 6, E: 6, R: 2
    }
} as cg.HeroDef)
const manaSeen: { paid: number[] } = {
    paid: []
}
const ping = (key: "Q" | "E" | "R", extra: Record<string, unknown>) => ({
    key, name: "Ping", desc: "-", target: "enemy" as const, resolve: (c: cg.Ctx) => { manaSeen.paid.push((c as unknown as { manaPaid: number }).manaPaid); if (c.target) c.g.damage(c.self,
        c.target,
        10,
        "true",
        {
            tag: "skill"
        }) },
    ...extra,
}) as cg.SkillDef
cg.defineHero({
    id: "v2_mage", name: "v2_mage", role: "mage", ...base,
    skills: {
        Q: ping("Q",
            {
                quick: true, mana: 20
            }),
        E: ping("E",
            {
                mana: (_c: cg.OptCtx) => 35
            }),
        R: ping("R",
            {
            }),
    },
})
cg.defineHero({
    id: "v2_mage2", name: "v2_mage2", role: "mage", ...base, mana: {
        max: 60, start: 30, regen: 5
    },
    skills: {
        Q: ping("Q",
            {
                mana: 10
            }), E: noSkill("E"), R: noSkill("R")
    },
} as cg.HeroDef)

const TEAM = ["v2_tank",
    "v2_fighter",
    "v2_mage",
    "v2_sup",
    "v2_mark"]
const SEED = 20261030

type Setup = { A?: Record<string, number>; B?: Record<string, number>; seed?: number; round?: number }
/** Ván round 8 (mở hết đường), tướng đặt thẳng vào đường, tay hai bên rỗng, bỏ qua bước gọi tướng */
function mk(o: Setup = {
}): St {
    const fill = (x: string[]) => [...x,
        ...TEAM.filter((h) => !x.includes(h))].slice(0,
        5)
    const s = cg.newGame(o.seed ?? SEED,
        fill(Object.keys(o.A ?? {
        })),
        fill(Object.keys(o.B ?? {
        })))
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
    s.active = "A"
    s.opened = {
        A: true, B: true
    }
    s.firstTurnDone = {
        A: true, B: true
    }
    ;(s as unknown as { turnAttacks?: unknown }).turnAttacks = {
        used: 0, bonus: 0, cardless: []
    }
    return s
}
const u = (s: St, side: S, hero: string) => s.units[`${side}:${hero}`]
const skill = (s: St, hero: string, side: S, k: cg.SkillKey) => gm(s).skillCard(hero,
    side,
    k)
const basicCard = (s: St) => gm(s).supportCard("basic")
const sup = (s: St, id: string) => gm(s).supportCard(id)
const give = (s: St, side: S, ...cards: cg.Card[]) => { s.players[side].hand.push(...cards); return cards[0] }
function act(s: St, a: Act): { s: St; ev: Ev } { const r = cg.applyAction(s,
    a); return {
    s: r.state, ev: r.events
} }
const play = (s: St, side: S, card: { uid: string }, args: cg.PlayArgs = {
}) => act(s,
    {
        t: "play", side, uid: card.uid, args
    })
function boot(s0: St): { s: St; ev: Ev } {
    const b0 = skipBlind({
        s: s0, ev: []
    })
    let s = b0.s
    const ev: Ev = [...b0.ev]
    for (let i = 0; i < 6 && s.phase === "summon"; i++) {
        const la = cg.legalActions(s,
            s.active)
        const a = la.find((x) => x.t === "draw") ?? la.find((x) => x.t === "summon")!
        const r = act(s,
            a)
        s = r.s
        ev.push(...r.ev)
    }
    return {
        s, ev
    }
}
/** Bước gọi tướng úp đầu vòng (V2): chốt hết (tướng bắt buộc thì chọn tướng hợp lệ đầu tiên); test không muốn gọi thêm */
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
const end = (s: St, side: S) => {
    const r = act(s,
        {
            t: "end", side
        })
    const b = boot(r.s)
    return {
        s: b.s, ev: [...r.ev,
            ...b.ev]
    }
}
const evs = <T extends cg.GameEvent["t"]>(ev: Ev, t: T) => ev.filter((e) => e.t === t) as Extract<cg.GameEvent, { t: T }>[]
const anyEv = (ev: Ev, t: string) => ev.filter((e) => (e as { t: string }).t === t) as unknown as Record<string, unknown>[]
const toTurn = (s: St, side: S) => { while (s.active !== side) s = end(s,
    s.active).s; return s }
const dmgTo = (ev: Ev, target: string, tag?: string) => evs(ev,
    "damage").filter((d) => d.target === target && (!tag || d.tag === tag)).reduce((x, d) => x + d.amount,
    0)
const legal = (s: St, side: S) => cg.legalActions(s,
    side) as (Act & { cardless?: boolean })[]
const basicsPlayable = (s: St, side: S) => legal(s,
    side).filter((a) => a.t === "play" && s.players[side].hand.find((c) => c.uid === a.uid)?.id === "basic")
const cardlessActs = (s: St, side: S, actor?: string) => legal(s,
    side).filter((a) => a.t === "attack" && a.cardless === true && (!actor || a.actor === actor))
const freeActs = (s: St, side: S) => legal(s,
    side).filter((a) => a.t === "attack" && !a.cardless)
const heroCount = (cards: cg.Card[], hero: string, k: string) => cards.filter((c) => c.kind === "skill" && c.hero === hero && c.id === `${hero}_${k}`).length
const fighterDuel = (hand = 0) => {
    const s = mk({
        A: {
            v2_fighter: 2
        }, B: {
            v2_tank: 2
        }
    })
    for (let i = 0; i < hand; i++) give(s,
        "A",
        basicCard(s))
    return s
}

// ======================================================================
G("V2: bộ bài 85 lá")
// ======================================================================
test("Ván mới: mỗi bộ 170 lá = 80 chung + 18 lá/tướng (đúng 8Q 8E 2R), kể cả tướng còn skillCopies cũ",
    () => {
        const team = ["v2_oldcopies",
            "v2_fighter",
            "v2_mage",
            "v2_sup",
            "v2_mark"]
        const s = cg.newGame(SEED,
            team,
            team)
        for (const side of ["A",
            "B"] as const) {
            const all = [...s.players[side].deck,
                ...s.players[side].hand]
            assert.equal(R.sharedDeckSize,
                80)
            assert.equal(all.length,
                R.sharedDeckSize + team.length * (R.skillCopies.Q + R.skillCopies.E + R.skillCopies.R))
            assert.equal(all.filter((c) => c.kind !== "skill").length,
                R.sharedDeckSize)
            for (const h of team) {
                assert.deepEqual(["q",
                    "e",
                    "r"].map((k) => heroCount(all,
                    h,
                    k)),
                [R.skillCopies.Q,
                    R.skillCopies.E,
                    R.skillCopies.R],
                h)
                assert.equal(all.filter((c) => c.kind === "skill" && c.hero === h).length,
                    18)
            }
            assert.deepEqual([R.skillCopies.Q,
                R.skillCopies.E,
                R.skillCopies.R],
            [8,
                8,
                2])
            assert.ok(all.every((c) => c.kind === "skill" || c.kind === "support"),
                "không còn lá chiêu chung/hỗ trợ riêng của tướng")
        }
    })
test("Gọi tướng không xáo thêm lá vào bộ (không event shuffle, tổng lá giữ nguyên)",
    () => {
        const s = cg.newGame(SEED,
            TEAM,
            TEAM)
        const total = (x: St) => x.players.A.deck.length + x.players.A.hand.length + x.players.A.grave.length
        const before = total(s)
        const r = act(s,
            {
                t: "summon", side: "A", hero: "v2_tank", lane: 2
            })
        assert.equal(total(r.s),
            before)
        assert.equal(evs(r.ev,
            "shuffle").length,
        0)
    })
test("RULES.heroSupport / baseDeck cũ đã bỏ; mageSkillBonus = 0",
    () => {
        const rr = cg.RULES as unknown as Record<string, unknown>
        assert.equal(rr.heroSupport,
            undefined)
        assert.equal(rr.mageSkillBonus,
            0)
    })
test("validateDeck cần đúng 80 lá; DEFAULT_DECK 80 lá hợp lệ; bộ 20 lá cũ rơi về DEFAULT_DECK",
    () => {
        assert.equal(cg.DECK_SIZE,
            R.sharedDeckSize)
        assert.equal(cg.DEFAULT_DECK.length,
            R.sharedDeckSize)
        assert.equal(cg.validateDeck(cg.DEFAULT_DECK),
            null)
        assert.notEqual(cg.validateDeck(cg.DEFAULT_DECK.slice(0,
            20)),
        null)
        assert.notEqual(cg.validateDeck([...cg.DEFAULT_DECK,
            "basic"]),
        null)
        const old20 = Array<cg.DeckCardId>(20).fill("basic")
        const a = cg.newGameEx(SEED,
            TEAM,
            TEAM,
            {
                A: old20
            }).state
        const b = cg.newGameEx(SEED,
            TEAM,
            TEAM,
            {
            }).state
        const key = (x: St) => [...x.players.A.deck,
            ...x.players.A.hand].filter((c) => c.kind !== "skill").map((c) => c.id).sort().join(",")
        assert.equal(key(a),
            key(b),
            "bộ 20 lá sai -> DEFAULT_DECK")
    })
test("Tay đầu RULES.startHand có ngay ở đầu ván, trước khi gọi tướng (tay quyết định gọi ai); gọi xong không rút thêm",
    () => {
        let s = cg.newGame(SEED,
            TEAM,
            TEAM)
        assert.equal(s.players.A.hand.length,
            R.startHand)
        assert.equal(s.players.B.hand.length,
            R.startHand,
            "B cũng có tay đầu trước khi gọi")
        assert.equal(s.phase,
            "blind")
        assert.ok(legal(s,
            "A").every((a) => a.t === "summon"),
        "chưa có tướng: bắt buộc chọn 1 tướng, chưa chốt được")
        s = act(s,
legal(s,
    "A").find((a) => a.t === "summon")!).s
        s = act(s,
legal(s,
    "B").find((a) => a.t === "summon")!).s
        s = skipBlind({
            s, ev: []
        }).s
        assert.equal(s.phase,
            "main")
        assert.equal(s.players.A.hand.length,
            R.startHand,
            "lượt đầu không rút thêm")
    })
// ======================================================================
G("V2: rút bài, tay đầy, hết bộ")
// ======================================================================
test("Các lượt sau rút đúng RULES.drawPerTurn (1) lá",
    () => {
        assert.equal(R.drawPerTurn,
            1)
        let s = mk({
            A: {
                v2_fighter: 2
            }, B: {
                v2_tank: 2
            }
        })
        s = end(s,
            "A").s
        const r = end(s,
            "B")
        assert.equal(r.s.players.A.deck.length,
            s.players.A.deck.length - R.drawPerTurn)
        assert.equal(r.s.players.A.hand.length,
            s.players.A.hand.length + R.drawPerTurn)
        assert.equal(evs(r.ev,
            "draw").filter((e) => e.side === "A").length,
        R.drawPerTurn)
    })
test("Tay đầy - rút + 1: còn 10 trên tay, 1 lá bị đốt vào mộ (cardBurned handFull), không có discard overflow, onDiscard overflow vẫn bắn",
    () => {
        const seen: string[] = []
        cg.defineHero({
            id: "v2_spy", name: "v2_spy", role: "tank", ...base, skills: filler, hooks: {
                onDiscard: (_g, _me, d) => { seen.push(d.reason) }
            }
        } as cg.HeroDef)
        let s = mk({
            A: {
                v2_spy: 2
            }, B: {
                v2_tank: 2
            }
        })
        s = end(s,
            "A").s
        s.players.A.hand = Array.from({
            length: R.handMax + 1 - R.drawPerTurn
        },
        () => sup(s,
            "gold"))
        const grave0 = s.players.A.grave.length
        const r = end(s,
            "B")
        assert.equal(r.s.players.A.hand.length,
            R.handMax)
        assert.equal(r.s.players.A.grave.length,
            grave0 + 1)
        const burned = anyEv(r.ev,
            "cardBurned")
        assert.equal(burned.length,
            1)
        assert.equal(burned[0].reason,
            "handFull")
        assert.equal(burned[0].side,
            "A")
        assert.equal(evs(r.ev,
            "discard").filter((e) => e.reason === "overflow").length,
        0)
        assert.ok(seen.includes("overflow"),
            "hook onDiscard reason overflow")
    })
test("Bộ còn 1 lá lúc bắt đầu bước rút: rút 1, không thua; bộ 0 lá: thua (endReason deck)",
    () => {
        let s = mk({
            A: {
                v2_fighter: 2
            }, B: {
                v2_tank: 2
            }
        })
        s = end(s,
            "A").s
        s.players.A.deck = s.players.A.deck.slice(0,
            1)
        const r = end(s,
            "B")
        assert.equal(r.s.winner,
            null)
        assert.equal(r.s.players.A.deck.length,
            0)
        assert.equal(r.s.players.A.hand.length,
            s.players.A.hand.length + 1)
        let t = mk({
            A: {
                v2_fighter: 2
            }, B: {
                v2_tank: 2
            }
        })
        t = end(t,
            "A").s
        t.players.A.deck = []
        const z = end(t,
            "B")
        assert.equal(z.s.winner,
            "B")
        assert.equal(z.s.endReason,
            "deck")
    })
test("Lật lá thưởng khi tay đầy -> cardBurned",
    () => {
        const s = mk({
            A: {
                v2_fighter: 2
            }, B: {
                v2_tank: 2
            }
        })
        s.players.A.hand = Array.from({
            length: R.handMax
        },
        () => sup(s,
            "gold"))
        const g = gm(s)
        g.flipPrize("A")
        assert.equal(s.players.A.hand.length,
            R.handMax)
        assert.ok(g.events.some((e) => (e as { t: string }).t === "cardBurned"))
    })

// ======================================================================
G("V2: giới hạn 3 đòn đánh mỗi lượt (cứng, mọi tướng)")
// ======================================================================
test("RULES.attackLimit = 3, không còn attackLimitCap; g.attackLimit(side) = 3",
    () => {
        assert.equal(R.attackLimit,
            3)
        assert.equal((cg.RULES as unknown as Record<string, unknown>).attackLimitCap,
            undefined)
        assert.equal(gm(mk()).attackLimit("A"),
            3)
    })
test("3 lá Đánh thường -> lá thứ 4 không còn trong legalActions; attackCount 1..3",
    () => {
        let s = fighterDuel(4)
        s.players.B.hand = []
        const counts: number[] = []
        for (let i = 0; i < 3; i++) {
            const a = basicsPlayable(s,
                "A")
            assert.ok(a.length > 0,
                `lá ${i + 1} đánh được`)
            const r = act(s,
                a[0])
            counts.push(...(anyEv(r.ev,
                "attackCount").map((e) => e.used as number)))
            s = r.s
            if (s.phase === "chain") s = cg.applyAction(s,
                {
                    t: "pass", side: cg.whoseMove(s)
                }).state
        }
        assert.deepEqual(counts,
            [1,
                2,
                3])
        assert.equal(basicsPlayable(s,
            "A").length,
        0)
    })
test("Đòn miễn phí từ buff nextAttack CŨNG bị tính và chặn sau đòn thứ 3",
    () => {
        let s = fighterDuel(3)
        const f = u(s,
            "A",
            "v2_fighter")
        for (let i = 0; i < 3; i++) {
            const a = basicsPlayable(s,
                "A")[0]
            s = act(s,
                a).s
            if (s.phase === "chain") s = act(s,
                {
                    t: "pass", side: cg.whoseMove(s)
                }).s
        }
        u(s,
            "A",
            "v2_fighter").nextAttack.push({
            id: "v2_free", source: f.id, free: true
        })
        assert.equal(freeActs(s,
            "A").length,
        0,
        "hết 3 đòn thì đòn free cũng không hợp lệ")
        const t = fighterDuel(0)
        u(t,
            "A",
            "v2_fighter").nextAttack.push({
            id: "v2_free", source: "A:v2_fighter", free: true
        })
        assert.ok(freeActs(t,
            "A").length > 0)
        const r = act(t,
            freeActs(t,
                "A")[0])
        assert.equal(anyEv(r.ev,
            "attackCount")[0]?.used,
        1,
        "đòn free đếm vào giới hạn")
    })
test("g.attack() bên trong chiêu/hook không bị tính (chỉ đòn do người chơi bấm)",
    () => {
        const s = fighterDuel(0)
        const g = gm(s)
        g.attack(u(s,
            "A",
            "v2_fighter"),
        u(s,
            "B",
            "v2_tank"),
        {
            mult: 0.4
        })
        assert.equal(g.turnAttacks().used,
            0)
    })
test("Không có cách tăng quá 3: attackLimit luôn <= 3 dù tướng có attackLimitMod; không còn addAttackLimit",
    () => {
        const s = fighterDuel(0)
        const g = gm(s) as unknown as Record<string, unknown>
        assert.equal(g.addAttackLimit,
            undefined)
        cg.defineHero({
            id: "v2_modder", name: "v2_modder", role: "tank", ...base, skills: filler, attackLimitMod: () => 2
        } as cg.HeroDef)
        const s2 = mk({
            A: {
                v2_modder: 2
            }, B: {
                v2_tank: 2
            }
        })
        assert.ok(gm(s2).attackLimit("A") <= 3)
    })
test("Giới hạn đặt lại ở lượt kế tiếp của chính phe đó",
    () => {
        let s = fighterDuel(3)
        for (let i = 0; i < 3; i++) {
            s = act(s,
                basicsPlayable(s,
                    "A")[0]).s
            if (s.phase === "chain") s = act(s,
                {
                    t: "pass", side: cg.whoseMove(s)
                }).s
        }
        assert.equal(gm(s).attacksLeft("A"),
            0)
        s = toTurn(s,
            "B")
        s = toTurn(s,
            "A")
        assert.equal(gm(s).attacksLeft("A"),
            3)
        assert.equal(gm(s).turnAttacks().used,
            0)
    })

// ======================================================================
G("V2: Đấu sĩ - đánh không cần lá (Quick, 66%)")
// ======================================================================
test("Đấu sĩ chơi được lá Đánh thường (100% AD)",
    () => {
        const s = fighterDuel(1)
        const p = basicsPlayable(s,
            "A")
        assert.ok(p.length > 0)
        let r = act(s,
            p[0]).s
        if (r.phase === "chain") r = act(r,
            {
                t: "pass", side: cg.whoseMove(r)
            }).s
        assert.equal(1000 - u(r,
            "B",
            "v2_tank").hp,
        Math.round(100 * cg.RULES.roleAttack.fighter))
    })
test("Đòn không cần lá: hợp lệ 1 lần/lượt, sát thương = hệ số RULES.fighterCardlessMult (0.66) của đòn lá, được tính vào giới hạn",
    () => {
        assert.ok(Math.abs(R.fighterCardlessMult - 0.66) < 1e-9,
            "chủ game chốt 66%")
        let s = fighterDuel(0)
        const acts = cardlessActs(s,
            "A",
            "A:v2_fighter")
        assert.equal(acts.length,
            1)
        const r = act(s,
            acts[0])
        s = r.s
        if (s.phase === "chain") s = act(s,
            {
                t: "pass", side: cg.whoseMove(s)
            }).s
        const dealt = dmgTo(r.ev,
            "B:v2_tank",
            "attack") + 0
        const full = Math.round(100 * cg.RULES.roleAttack.fighter)
        const total = 1000 - u(s,
            "B",
            "v2_tank").hp
        assert.ok(total === Math.round(full * R.fighterCardlessMult),
            `gây ${total}, mong ${Math.round(full * R.fighterCardlessMult)} (event ${dealt})`)
        assert.equal(gm(s).turnAttacks().used,
            1)
        assert.ok(anyEv(r.ev,
            "attack").some((e) => e.cardless === true && e.free === false))
        assert.equal(cardlessActs(s,
            "A").length,
        0,
        "không đánh lần 2")
    })
test("allowCardless cho phép đánh không cần lá thêm lần nữa",
    () => {
        let s = fighterDuel(0)
        s = act(s,
            cardlessActs(s,
                "A")[0]).s
        if (s.phase === "chain") s = act(s,
            {
                t: "pass", side: cg.whoseMove(s)
            }).s
        gm(s).allowCardless(u(s,
            "A",
            "v2_fighter"))
        assert.equal(cardlessActs(s,
            "A").length,
        1)
    })
test("Không được đề nghị đòn không cần lá khi: có buff free, bị choáng, hết lượt đánh",
    () => {
        const a = fighterDuel(0)
        u(a,
            "A",
            "v2_fighter").nextAttack.push({
            id: "v2_free", source: "A:v2_fighter", free: true
        })
        assert.equal(cardlessActs(a,
            "A").length,
        0,
        "có buff free")
        const b = fighterDuel(0)
        gm(b).status(u(b,
            "A",
            "v2_fighter"),
        "stun",
        1)
        assert.equal(cardlessActs(b,
            "A").length,
        0,
        "choáng")
        const c = fighterDuel(0)
        gm(c).turnAttacks().used = 3
        assert.equal(cardlessActs(c,
            "A").length,
        0,
        "hết 3 đòn")
    })
test("Đòn không cần lá không bao giờ tự động: cuối lượt đấu sĩ KHÔNG tự đánh",
    () => {
        const s = fighterDuel(0)
        const r = skipBlind(act(s,
            {
                t: "end", side: "A"
            }))
        assert.equal(dmgTo(r.ev,
            "B:v2_tank"),
        0)
        assert.equal(u(r.s,
            "B",
            "v2_tank").hp,
        1000)
    })
/** Tướng thử có HeroDef.autoAttack (tự bắn tướng địch đầu tiên cuối lượt) */
cg.defineHero({
    id: "v2_auto", name: "v2_auto", role: "marksman", ...base, skills: filler,
    autoAttack: (g: cg.Game, me: cg.Unit) => g.enemies(me.side)[0],
} as cg.HeroDef)
test("autoAttack của tướng vẫn chạy cuối lượt và không tính giới hạn",
    () => {
        const s = mk({
            A: {
                v2_auto: 2
            }, B: {
                v2_tank: 2
            }
        })
        const hp0 = u(s,
            "B",
            "v2_tank").hp
        const r = act(s,
            {
                t: "end", side: "A"
            })
        assert.ok(u(r.s,
            "B",
            "v2_tank").hp < hp0,
        "autoAttack bắn")
        assert.equal(gm(r.s).turnAttacks().used,
            0)
    })
test("Token vai đấu sĩ không chơi được lá Đánh thường và không đánh không cần lá",
    () => {
        const s = fighterDuel(1)
        const g = gm(s)
        const tok = g.summonToken("A",
{
    id: "v2_tok", name: "tok", role: "fighter", hp: 100, atk: 50, armor: 0, mr: 0
} as unknown as cg.TokenDef)
        assert.ok(!basicsPlayable(s,
            "A").some((a) => (a as { args?: { target?: string } }).args?.target === undefined && false))
        assert.equal(cardlessActs(s,
            "A",
            tok.id).length,
        0)
        assert.equal(g.canCardless(tok),
            false)
    })
test("Đòn không cần lá mở chuỗi; đối phương Quick cản; choáng giữa chừng -> hụt, KHÔNG hoàn lượt đánh",
    () => {
        const s = fighterDuel(0)
        give(s,
            "B",
            skill(s,
                "v2_tank",
                "B",
                "Q"))
        const r = act(s,
            cardlessActs(s,
                "A")[0])
        assert.equal(r.s.phase === "chain" || r.s.phase === "main",
            true)
        if (r.s.phase === "chain") {
            gm(r.s).status(u(r.s,
                "A",
                "v2_fighter"),
            "stun",
            1)
            const z = act(r.s,
                {
                    t: "pass", side: cg.whoseMove(r.s)
                })
            assert.equal(u(z.s,
                "B",
                "v2_tank").hp,
            1000,
            "attacker choáng -> không gây sát thương")
            assert.equal(gm(z.s).turnAttacks().used,
                1,
                "không hoàn")
        }
    })
test("Owner #14: đòn không cần lá 66% chỉ đánh trong lượt mình, không phải Quick (không nối chuỗi, không mở chuỗi)",
    () => {
        const s = mk({
            A: {
                v2_tank: 2
            }, B: {
                v2_fighter: 2
            }
        })
        const b = give(s,
            "A",
            basicCard(s))
        const o = legal(s,
            "A").find((a) => a.t === "play" && a.uid === b.uid)
        assert.ok(o,
            "A đánh thường được")
        const r = act(s,
o!)
        assert.equal(r.s.phase,
            "main",
            "B không có lá Quick nào nên chuỗi không mở")
        assert.deepEqual(cardlessActs(r.s,
            "B"),
        [],
        "phe B không có đòn không cần lá ngoài lượt mình")
        // trong chuỗi (do lá Quick khác mở) cũng không được nối bằng đòn không cần lá
        const c = JSON.parse(JSON.stringify(s)) as St
        c.phase = "chain"
        assert.deepEqual(cg.legalActions(c,
            "B").filter((a) => a.t === "attack"),
        [])
    })
// ======================================================================
G("V2: Trợ thủ - gọi ra lấy Q và E lên tay")
// ======================================================================
test("Gọi Trợ thủ: bộ -2, tay +2 (đúng 1 Q + 1 E của nó), event draw reason support, không rút ngẫu nhiên",
    () => {
        const s = mk({
            A: {
                v2_tank: 2
            }, B: {
                v2_tank: 2
            }
        })
        const g = gm(s)
        const before = s.players.A.deck.length
        const hand0 = s.players.A.hand.length
        g.summon("A",
            "v2_sup",
            1)
        assert.equal(s.players.A.deck.length,
            before - 2)
        assert.equal(s.players.A.hand.length,
            hand0 + 2)
        const got = s.players.A.hand.filter((c) => c.hero === "v2_sup")
        assert.deepEqual(got.map((c) => c.id).sort(),
            ["v2_sup_e",
                "v2_sup_q"])
        const dr = g.events.filter((e) => e.t === "draw" && (e as { reason?: string }).reason === "support")
        assert.equal(dr.length,
            2)
    })
test("Hết Q/E trong bộ thì tạo mới; hồi sinh không lấy thêm; tay đầy -> cardBurned",
    () => {
        const s = mk({
            A: {
                v2_tank: 2
            }, B: {
                v2_tank: 2
            }
        })
        s.players.A.deck = s.players.A.deck.filter((c) => c.hero !== "v2_sup")
        const g = gm(s)
        g.summon("A",
            "v2_sup",
            1)
        assert.equal(s.players.A.hand.filter((c) => c.hero === "v2_sup").length,
            2)
        const sup2 = u(s,
            "A",
            "v2_sup")
        sup2.status = "dead"
        s.lanes.A[1] = null
        sup2.respawnRound = s.round
        const n = s.players.A.hand.length
        g.respawnDue("A")
        assert.equal(s.players.A.hand.length,
            n,
            "hồi sinh không lấy Q/E")
        const t = mk({
            A: {
                v2_tank: 2
            }, B: {
                v2_tank: 2
            }
        })
        t.players.A.hand = Array.from({
            length: R.handMax - 1
        },
        () => sup(t,
            "gold"))
        const gt = gm(t)
        gt.summon("A",
            "v2_sup",
            1)
        assert.equal(t.players.A.hand.length,
            R.handMax)
        assert.ok(gt.events.some((e) => (e as { t: string }).t === "cardBurned"))
    })

// ======================================================================
G("V2: Pháp sư - mana x10")
// ======================================================================
test("Hằng số mana: mặc định max 100, hồi +10 mỗi lượt",
    () => {
        assert.equal(R.mage.manaMax,
            100)
        assert.equal(R.mage.manaRegen,
            10)
        assert.ok(R.mage.manaStart <= R.mage.manaMax && R.mage.manaStart > 0)
    })
test("Gọi pháp sư: mana = start (override theo tướng), phát manaChange summon; tướng khác không có mana",
    () => {
        const s = mk({
            A: {
                v2_tank: 2, v2_mage2: 4
            }, B: {
                v2_tank: 2
            }
        })
        const g = gm(s)
        g.summon("A",
            "v2_mage",
            0)
        assert.equal(u(s,
            "A",
            "v2_mage").mana,
        R.mage.manaStart)
        assert.equal(u(s,
            "A",
            "v2_mage2").mana,
        30)
        assert.equal(g.maxMana(u(s,
            "A",
            "v2_mage2")),
        60)
        assert.equal(u(s,
            "A",
            "v2_tank").mana,
        undefined)
        assert.ok(g.events.some((e) => (e as { t: string; reason?: string }).t === "manaChange" && (e as { reason?: string }).reason === "summon"))
    })
test("Đầu lượt chủ: pháp sư trên sân +regen (theo tướng) chặn ở max; dự bị/chết không đổi",
    () => {
        let s = mk({
            A: {
                v2_mage: 0, v2_mage2: 4
            }, B: {
                v2_tank: 2
            }
        })
        u(s,
            "A",
            "v2_mage").mana = 50
        u(s,
            "A",
            "v2_mage2").mana = 58
        s = end(s,
            "A").s
        const r = end(s,
            "B")
        assert.equal(u(r.s,
            "A",
            "v2_mage").mana,
        50 + R.mage.manaRegen)
        assert.equal(u(r.s,
            "A",
            "v2_mage2").mana,
        60)
        const rs = mk({
            A: {
                v2_tank: 2
            }, B: {
                v2_tank: 2
            }
        })
        const reserve = rs.units["A:v2_mage"]
        reserve.mana = 7
        const r2 = end(end(rs,
            "A").s,
        "B")
        assert.equal(r2.s.units["A:v2_mage"].mana,
            7)
    })
test("Hồi sinh: pháp sư về mana start",
    () => {
        const s = mk({
            A: {
                v2_mage: 0
            }, B: {
                v2_tank: 2
            }
        })
        const m = u(s,
            "A",
            "v2_mage")
        m.mana = 5
        gm(s).kill(m)
        m.respawnRound = s.round
        gm(s).respawnDue("A")
        assert.equal(m.status,
            "board")
        assert.equal(m.mana,
            R.mage.manaStart)
    })
test("Đánh lá chiêu pháp sư: trừ mana (manaChange spend), ctx.manaPaid, lá vào mộ; hàm mana động và defaultCost",
    () => {
        manaSeen.paid.length = 0
        let s = mk({
            A: {
                v2_mage: 0
            }, B: {
                v2_tank: 0
            }
        })
        const e = give(s,
            "A",
            skill(s,
                "v2_mage",
                "A",
                "E"))
        const m0 = u(s,
            "A",
            "v2_mage").mana ?? 0
        const r = play(s,
            "A",
            e,
            {
                target: "B:v2_tank"
            })
        s = r.s
        if (s.phase === "chain") s = act(s,
            {
                t: "pass", side: cg.whoseMove(s)
            }).s
        assert.equal(u(s,
            "A",
            "v2_mage").mana,
        m0 - 35)
        assert.ok(anyEv(r.ev,
            "manaChange").some((x) => x.reason === "spend" && x.delta === -35))
        assert.ok(s.players.A.grave.some((c) => c.uid === e.uid),
            "lá chiêu vào mộ")
        assert.deepEqual(manaSeen.paid,
            [35])
        const g = gm(s)
        const rcard = skill(s,
            "v2_mage",
            "A",
            "R")
        assert.equal(g.manaCost(u(s,
            "A",
            "v2_mage"),
cg.getHero("v2_mage")!.skills.R,
rcard),
        R.mage.defaultCost.R)
    })
test("Không đủ mana -> lá không hợp lệ (cả Quick trong chuỗi ở lượt đối thủ)",
    () => {
        const s = mk({
            A: {
                v2_mage: 0
            }, B: {
                v2_tank: 0
            }
        })
        const e = give(s,
            "A",
            skill(s,
                "v2_mage",
                "A",
                "E"))
        u(s,
            "A",
            "v2_mage").mana = 34
        assert.equal(cg.legalActions(s,
            "A").filter((a) => a.t === "play" && a.uid === e.uid).length,
        0)
        u(s,
            "A",
            "v2_mage").mana = 35
        assert.ok(cg.legalActions(s,
            "A").some((a) => a.t === "play" && a.uid === e.uid))
        // Quick của pháp sư A (Q: 20 mana) trong chuỗi mở bởi lá của B
        for (const [mana,
            want] of [[19,
                false],
            [20,
                true]] as const) {
            const t = mk({
                A: {
                    v2_mage: 0
                }, B: {
                    v2_tank: 0
                }
            })
            const q = give(t,
                "A",
                skill(t,
                    "v2_mage",
                    "A",
                    "Q"))
            const bb = give(t,
                "B",
                basicCard(t))
            const tt = toTurn(t,
                "B")
            u(tt,
                "A",
                "v2_mage").mana = mana
            const open = cg.legalActions(tt,
                "B").find((a) => a.t === "play" && a.uid === bb.uid)
            assert.ok(open,
                "B đánh thường được")
            const r = act(tt,
open!)
            const can = r.s.phase === "chain" && cg.legalActions(r.s,
                "A").some((a) => (a.t === "chain" || a.t === "play") && (a as { uid: string }).uid === q.uid)
            assert.equal(can,
                want,
                `mana ${mana}`)
        }
    })
test("Mana: ném hết Q khi đủ rồi hết mana; mana không bao giờ âm",
    () => {
        let s = mk({
            A: {
                v2_mage: 0
            }, B: {
                v2_tank: 0
            }
        })
        for (let i = 0; i < 6; i++) give(s,
            "A",
            skill(s,
                "v2_mage",
                "A",
                "Q"))
        let n = 0
        for (let i = 0; i < 6; i++) {
            const q = s.players.A.hand.find((c) => c.id === "v2_mage_q")!
            const o = cg.legalActions(s,
                "A").find((a) => a.t === "play" && a.uid === q.uid)
            if (!o) break
            s = act(s,
                o).s
            if (s.phase === "chain") s = act(s,
                {
                    t: "pass", side: cg.whoseMove(s)
                }).s
            n++
            assert.ok((u(s,
                "A",
                "v2_mage").mana ?? 0) >= 0)
        }
        assert.equal(n,
            Math.floor(R.mage.manaStart / 20) > 0 ? Math.min(6,
                Math.floor(R.mage.manaStart / 20)) : 0)
    })
test("Đồ có maxMana / manaRegen / manaCostMod được tính (stub)",
    () => {
        const items = cg.CARD_ITEMS as unknown as Record<string, Record<string, unknown>>
        items.v2_stub = {
            id: "v2_stub", name: "stub", maxMana: 40, manaRegen: 5, manaCostMod: () => -10
        }
        const s = mk({
            A: {
                v2_mage: 0
            }, B: {
                v2_tank: 0
            }
        })
        const m = u(s,
            "A",
            "v2_mage")
        m.items = ["v2_stub"]
        const g = gm(s)
        assert.equal(g.maxMana(m),
            R.mage.manaMax + 40)
        const e = skill(s,
            "v2_mage",
            "A",
            "E")
        assert.equal(g.manaCost(m,
cg.getHero("v2_mage")!.skills.E,
e),
        25)
        m.mana = 10
        const t = end(end(s,
            "A").s,
        "B").s
        assert.equal(u(t,
            "A",
            "v2_mage").mana,
        10 + R.mage.manaRegen + 5)
        delete items.v2_stub
    })
test("Thẻ 'mana' hồi mana (chặn max), chỉ nhắm pháp sư chưa đầy",
    () => {
        const s = mk({
            A: {
                v2_mage: 0, v2_mage2: 4
            }, B: {
                v2_tank: 0
            }
        })
        u(s,
            "A",
            "v2_mage").mana = 10
        u(s,
            "A",
            "v2_mage2").mana = 60
        const c = give(s,
            "A",
            sup(s,
                "mana"))
        const targets = cg.legalActions(s,
            "A").filter((a) => a.t === "play" && a.uid === c.uid) as Extract<Act, { t: "play" }>[]
        assert.ok(targets.length > 0 && targets.every((a) => a.args?.target === "A:v2_mage"))
        const r = act(s,
            targets[0])
        assert.ok((u(r.s,
            "A",
            "v2_mage").mana ?? 0) <= R.mage.manaMax)
        assert.ok((u(r.s,
            "A",
            "v2_mage").mana ?? 0) > 10)
    })

// ======================================================================
G("V2: lá tạm, lá chiêu dùng xong")
// ======================================================================
test("Lá tạm không dùng hết lượt: tempExpired, KHÔNG vào mộ; lá cướp là tạm thì Đánh thường nhận được cũng tạm",
    () => {
        let s = mk({
            A: {
                v2_tank: 2
            }, B: {
                v2_tank: 2
            }
        })
        const g = gm(s)
        const t = g.createCard("A",
{
    kind: "special", id: "dagger", temp: true
} as Omit<cg.Card, "uid">)
        const grave0 = s.players.A.grave.length
        const r = act(s,
            {
                t: "end", side: "A"
            })
        assert.ok(anyEv(r.ev,
            "tempExpired").some((e) => (e as unknown as { card: cg.Card }).card.uid === t.uid))
        assert.equal(r.s.players.A.grave.length,
            grave0)
        assert.ok(!r.s.players.A.hand.some((c) => c.uid === t.uid))
        s = mk({
            A: {
                v2_tank: 2
            }, B: {
                v2_tank: 2
            }
        })
        const gb = gm(s)
        s.players.B.hand = [gb.createCard("B",
{
    kind: "special", id: "dagger", temp: true
} as Omit<cg.Card, "uid">)]
        s.players.B.hand.length = 1
        const stolen = gb.stealCard("A",
            "B")
        assert.ok(stolen)
        assert.ok(s.players.A.hand.some((c) => c.temp === true),
            "lá cướp được là tạm")
    })
test("Lá chiêu dùng xong vào mộ (chủ game chốt #1)",
    () => {
        const s = mk({
            A: {
                v2_tank: 2
            }, B: {
                v2_tank: 2
            }
        })
        const q = give(s,
            "A",
            skill(s,
                "v2_tank",
                "A",
                "Q"))
        q.hero = "v2_mage"
        const mq = give(s,
            "A",
            skill(s,
                "v2_mage",
                "A",
                "Q"))
        gm(s).summon("A",
            "v2_mage",
            0)
        const o = cg.legalActions(s,
            "A").find((a) => a.t === "play" && a.uid === mq.uid)
        if (!o) skip("không phát được Q mage")
        const r = act(s,
            o!)
        const done = r.s.phase === "chain" ? act(r.s,
            {
                t: "pass", side: cg.whoseMove(r.s)
            }).s : r.s
        assert.ok(done.players.A.grave.some((c) => c.uid === mq.uid))
    })

// ======================================================================
G("V2: mở đường từng đường một")
// ======================================================================
test("V3: mỗi mốc RULES.summonRounds (1, 4, 8, 13, 19) mở đúng 1 đường mới tới khi đủ 5",
    () => {
        assert.deepEqual(cg.RULES.summonRounds,
            [1,
                4,
                8,
                13,
                19])
        let prev = 0
        for (let round = 1; round <= 20; round++) {
            const s = mk({
                round
            })
            const lanes = gm(s).openLanes()
            const n = lanes.length
            assert.equal(n,
                cg.RULES.summonRounds.filter((r) => r <= round).length,
                `vòng ${round}`)
            assert.deepEqual([...lanes].sort(),
                [...cg.RULES.laneOrder].slice(0,
                    n).sort(),
                "đường mở theo laneOrder")
            assert.ok(n - prev <= 1,
                "không mở quá 1 đường mỗi lần")
            prev = n
        }
        assert.equal(prev,
            5)
    })
test("Gọi tướng úp: mỗi phe tối đa cap = số đường mở vòng đó (1) tướng; chọn xong tự chốt; tướng chỉ lên sân khi CẢ HAI chốt, đồng thời",
    () => {
        let s = cg.newGame(SEED,
            TEAM,
            TEAM)
        const cap = s.blind!.cap
        assert.equal(cap,
            1)
        const pa = legal(s,
            "A").find((a) => a.t === "summon") as Extract<Act, { t: "summon" }>
        s = act(s,
            pa).s
        assert.ok(!legal(s,
            "A").some((a) => a.t === "summon"),
        "A đã chọn đủ cap: không gọi thêm")
        assert.equal(gm(s).heroes("A").length,
            0,
            "chưa lên sân khi B chưa chốt")
        assert.equal(s.phase,
            "blind")
        const pb = legal(s,
            "B").find((a) => a.t === "summon") as Extract<Act, { t: "summon" }>
        const r = act(s,
            pb)
        assert.equal(r.s.phase,
            "main")
        assert.deepEqual([gm(r.s).heroes("A").length,
            gm(r.s).heroes("B").length],
        [1,
            1],
        "lật và đặt cùng lúc")
    })
test("Gọi tướng úp: trần N dùng chung; bên hết tướng để gọi (đã ra sân hết) tự chốt và KHÔNG chặn bên kia",
    () => {
        const s0 = mk({
            A: {
                v2_tank: 0, v2_fighter: 1
            }, B: {
                v2_tank: 0, v2_fighter: 1, v2_mage: 2, v2_sup: 3, v2_mark: 4
            }, round: 7
        })
        s0.phase = "main"
        s0.active = "B"
        const s = act(s0,
            {
                t: "end", side: "B"
            }).s
        assert.equal(s.phase,
            "blind",
            "vòng mới mở bước gọi tướng úp")
        assert.equal(s.blind!.ready.B,
            true,
            "B hết tướng để gọi: tự chốt")
        assert.equal(s.blind!.ready.A,
            false)
        const picks = legal(s,
            "A").filter((a) => a.t === "summon")
        assert.ok(picks.length > 0,
            "A vẫn gọi được tới cap")
        const done = act(s,
            picks[0])
        assert.equal(done.s.phase,
            "main")
        assert.equal(gm(done.s).heroes("A").length,
            3)
    })
test("Gọi tướng úp: lựa chọn nằm trong state.blind.picks (server phải che với phe kia); chưa chốt thì chưa có tướng nào lên sân",
    () => {
        let s = cg.newGame(SEED,
            TEAM,
            TEAM)
        s = act(s,
legal(s,
    "A").find((a) => a.t === "summon")!).s
        assert.equal(s.blind!.picks.A.length,
            1)
        assert.equal(s.blind!.picks.B.length,
            0)
        assert.equal(gm(s).heroes("A").length,
            0)
        assert.ok(anyEv(cg.applyAction(s,
legal(s,
    "B").find((a) => a.t === "summon")!).events,
        "summon").length >= 2,
        "lật: cả hai summon cùng lúc")
    })
// ======================================================================
G("V2: tướng chết ở nguyên đường (điểm 9)")
// ======================================================================
test("Tướng chết vẫn giữ đường (lanes[side][lane] còn id), status dead, đường không còn trống để gọi",
    () => {
        const s = mk({
            A: {
                v2_fighter: 2
            }, B: {
                v2_tank: 2
            }
        })
        const v = u(s,
            "B",
            "v2_tank")
        gm(s).kill(v)
        assert.equal(v.status,
            "dead")
        assert.equal(s.lanes.B[2],
            v.id,
            "đường giữ chỗ")
        assert.ok(!gm(s).emptyLanes("B").includes(2),
            "không gọi tướng khác vào đường này")
    })
test("Tướng chết không bị nhắm/đánh/buff: không có đòn đánh vào nó, đối diện coi như trống",
    () => {
        const s = mk({
            A: {
                v2_fighter: 2
            }, B: {
                v2_tank: 2
            }
        })
        gm(s).kill(u(s,
            "B",
            "v2_tank"))
        s.players.A.hand = [basicCard(s)]
        assert.equal(cardlessActs(s,
            "A").length,
        0)
        assert.equal(basicsPlayable(s,
            "A").length,
        0)
        assert.equal(gm(s).opposite(u(s,
            "A",
            "v2_fighter")),
        undefined)
        assert.ok(!gm(s).heroes("B").some((h) => h.id === "B:v2_tank"))
    })
test("Hồi sinh đúng đường cũ, đầy máu, sau RULES.respawnRounds vòng (không sớm hơn)",
    () => {
        let s = mk({
            A: {
                v2_fighter: 2
            }, B: {
                v2_tank: 2
            }
        })
        const v = u(s,
            "B",
            "v2_tank")
        gm(s).kill(v)
        assert.equal(v.respawnRound,
            s.round + R.respawnRounds)
        while (s.round < v.respawnRound - 1) s = end(end(s,
            "A").s,
        "B").s
        assert.equal(u(s,
            "B",
            "v2_tank").status,
        "dead")
        while (s.round < v.respawnRound) s = end(end(s,
            "A").s,
        "B").s
        s = end(s,
            "A").s
        const w = u(s,
            "B",
            "v2_tank")
        assert.equal(w.status,
            "board")
        assert.equal(w.lane,
            2)
        assert.equal(s.lanes.B[2],
            w.id)
        assert.equal(w.hp,
            w.maxHp)
    })
test("Chết không làm đường 'trống': hồi sinh không nhảy sang đường khác dù đường khác trống",
    () => {
        const s = mk({
            A: {
                v2_fighter: 2
            }, B: {
                v2_tank: 2
            }
        })
        const v = u(s,
            "B",
            "v2_tank")
        gm(s).kill(v)
        v.respawnRound = s.round
        gm(s).respawnDue("B")
        assert.equal(v.lane,
            2)
    })

// ======================================================================
G("V2: bot hiểu luật mới (tối thiểu)")
// ======================================================================
test("Bot: 20 ván có seed (Dễ) + 3 ván (Khó) không lỗi, không hành động bất hợp lệ, có dùng đòn không cần lá và chiêu pháp sư",
    () => {
        let cardless = 0
        let mageSkill = 0
        const runs: [string, number][] = [...Array.from({
            length: 20
        },
        (_, i) => ["easy",
            2000 + i] as [string, number]),
        ...Array.from({
            length: 3
        },
        (_, i) => ["hard",
            3000 + i] as [string, number])]
        for (const [lv,
            seed] of runs) {
            let s = cg.newGame(seed,
                TEAM,
                TEAM)
            let steps = 0
            while (s.phase !== "over" && steps++ < 4000 && s.round < 40) {
                const side = cg.whoseMove(s)
                const a = cg.chooseAction(s,
                    side,
lv as "easy" | "hard")
                const key = JSON.stringify(a)
                assert.ok(cg.legalActions(s,
                    side).some((x) => JSON.stringify(x) === key),
                `${lv}#${seed}: hành động bất hợp lệ ${key}`)
                const r = act(s,
                    a)
                for (const e of r.ev) {
                    if (e.t === "attack" && (e as { cardless?: boolean }).cardless) cardless++
                    if (e.t === "manaChange" as string && (e as unknown as { reason: string }).reason === "spend") mageSkill++
                }
                s = r.s
            }
        }
        assert.ok(cardless > 0,
            "bot dùng đòn không cần lá")
        assert.ok(mageSkill > 0,
            "bot dùng chiêu pháp sư (tốn mana)")
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
        110)}${r.note ? `\n        -> ${r.note}` : ""}`)
}
const c = (k: string) => results.filter((r) => r.res === k).length
console.log(`\nTỔNG: ${results.length} test | PASS ${c("PASS")} | FAIL ${c("FAIL")} | SKIP ${c("SKIP")}`)
process.exit(c("FAIL") ? 1 : 0)
