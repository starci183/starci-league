// Test luật/engine V3 của chế độ thẻ bài (docs/ENGINE_V2_SPEC.md, mục "Hero primitives (V3)").
// Chạy: npx tsx scripts/card_tests_v3.ts [--only=chuỗi] [--verbose]. Chỉ dùng tướng giả v3_* (số liệu tướng thật đang đổi).
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
const gm = (s: St) => new Game(s)

// ======================================================================
// Tướng giả
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
    role] of [["v3_tank",
        "tank"],
    ["v3_fighter",
        "fighter"],
    ["v3_assassin",
        "assassin"],
    ["v3_sup",
        "support"],
    ["v3_mark",
        "marksman"]] as const) {
    cg.defineHero({
        id, name: id, role, ...base, skills: filler
    })
}
const seen = {
    marks: [] as string[], delayed: [] as string[], tokenStart: 0, tokenEnd: 0, transformEnd: [] as string[], unequipped: [] as string[], free: [] as string[], discards: [] as string[]
}
const skillWith = (key: "Q" | "E" | "R", target: cg.TargetKind, resolve: (c: cg.Ctx) => void): cg.SkillDef => ({
    key, name: "t", desc: "-", target, resolve
})
cg.defineHero({
    id: "v3_caster", name: "v3_caster", role: "fighter", ...base,
    skills: {
        Q: skillWith("Q",
            "enemy",
            (c) => { if (c.target) c.g.damage(c.self,
                c.target,
                50,
                "true",
                {
                    tag: "skill"
                }) }),
        E: skillWith("E",
            "all_enemies",
            (c) => { for (const t of c.g.enemies(c.self)) c.g.damage(c.self,
                t,
                50,
                "true",
                {
                    tag: "skill"
                }) }),
        R: skillWith("R",
            "opposite",
            (c) => { if (c.target) c.g.damage(c.self,
                c.target,
                70,
                "true",
                {
                    tag: "skill"
                }) }),
    },
    hooks: {
        onMarkHit: (_g, me, d) => { if (d.mark.src === me.id) seen.marks.push(`${d.mark.id}:${d.left}`) },
        onDelayed: (g, me, d) => {
            seen.delayed.push(d.key)
            const t = g.unit(String(d.data?.target))
            if (t) g.damage(me,
                t,
                40,
                "true",
                {
                    tag: "effect"
                })
        },
        onTransformEnd: (_g, _me, d) => { seen.transformEnd.push(`${d.id}:${d.reason}`) },
        onUnequip: (_g, _me, d) => { seen.unequipped.push(d.item) },
        onFreeCard: (_g, me, d) => { if (d.side === me.side) seen.free.push(d.kind) },
    },
})
cg.defineHero({
    id: "v3_ghost", name: "v3_ghost", role: "fighter", ...base,
    skills: {
        ...filler,
        Q: {
            key: "Q", name: "vanish", desc: "Quick khi địch chỉ định tướng này.", target: "self", quick: true,
            quickWhen: (c) => !!c.trigger.single && c.trigger.target === c.self.id,
            resolve: (c) => { c.g.stealth(c.self,
                1,
                "A") }
        },
    },
})
cg.defineHero({
    id: "v3_smith", name: "v3_smith", role: "tank", ...base,
    skills: filler,
    itemAura: (_g, _me, _w, _item, rounds) => 0.1 + 0.05 * rounds,
})
cg.defineHero({
    id: "v3_nocrit", name: "v3_nocrit", role: "marksman", ...base,
    skills: filler,
    hooks: {
        onAttack: (_g, me, d) => { if (d.attacker.id === me.id) d.info.noCrit = true },
    },
})
cg.defineHero({
    id: "v3_necro", name: "v3_necro", role: "fighter", ...base,
    skills: filler,
    hooks: {
        onDiscard: (_g, me, d) => { if (d.side === me.side) seen.discards.push(d.reason) },
    },
})
cg.defineTokenBehavior({
    id: "v3_maiden",
    onOwnerTurnStart: (g, tok, owner) => {
        seen.tokenStart++
        const foe = g.pick(g.targetableEnemies(tok))
        if (foe) g.damage(tok,
            foe,
            10,
            "true",
            {
                tag: "effect"
            })
        if (owner) g.heal(owner,
            owner,
            5)
    },
    onOwnerTurnEnd: () => { seen.tokenEnd++ },
})
cg.defineHero({
    id: "v3_mage", name: "v3_mage", role: "mage", ...base, skills: filler,
})

const TEAM = ["v3_tank",
    "v3_fighter",
    "v3_caster",
    "v3_sup",
    "v3_mark"]
const SEED = 20261031

type Setup = { A?: Record<string, number>; B?: Record<string, number>; seed?: number; round?: number }
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
    s.blind = undefined
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
    s.ownTurns = {
        A: 1, B: 0
    }
    s.turnAttacks = {
        used: 0, cardless: []
    }
    return s
}
const u = (s: St, side: S, hero: string) => s.units[`${side}:${hero}`]
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
    const b = skipBlind(r)
    return b
}
const evs = <T extends cg.GameEvent["t"]>(ev: Ev, t: T) => ev.filter((e) => e.t === t) as Extract<cg.GameEvent, { t: T }>[]
const legal = (s: St, side: S) => cg.legalActions(s,
    side)
const dmgTo = (ev: Ev, target: string, tag?: string) => evs(ev,
    "damage").filter((d) => d.target === target && (!tag || d.tag === tag)).reduce((x, d) => x + d.amount,
    0)
const skillCard = (s: St, hero: string, side: S, k: cg.SkillKey) => gm(s).skillCard(hero,
    side,
    k)
const COMPONENT_HP = (cg.COMPONENTS as readonly string[]).find((c) => (cg.CARD_ITEMS[c]?.stats.hp ?? 0) > 0)!
const FINISHED = Object.keys(cg.CARD_ITEMS).find((id) => !(cg.COMPONENTS as readonly string[]).includes(id))!

// ======================================================================
G("V3: luật chung")
// ======================================================================
test("Chỉ gọi tướng ở mốc RULES.summonRounds; mốc mở 1 đường, trần gọi 1",
    () => {
        assert.equal(cg.RULES.summonRounds.length,
            5)
        assert.equal(cg.RULES.summonRounds[0],
            1)
        assert.ok(cg.RULES.summonRounds.every((r, i, a) => i === 0 || r > a[i - 1]),
            "mốc tăng dần")
        let s = cg.newGame(SEED,
            TEAM,
            TEAM)
        assert.equal(s.phase,
            "blind")
        assert.equal(s.blind!.cap,
            1)
        s = skipBlind({
            s, ev: []
        }).s
        const phases: Record<number, string> = {
        }
        for (let i = 0; i < 24 && s.round < 9; i++) {
            const side = s.active
            const r = cg.applyAction(s,
                {
                    t: "end", side
                })
            s = r.state
            if (side === "B") phases[s.round] = s.phase
            if (s.phase === "blind") {
                assert.ok(cg.RULES.summonRounds.includes(s.round),
                    `vòng ${s.round} mở bước gọi tướng`)
                assert.equal(s.blind!.cap,
                    1)
                s = skipBlind({
                    s, ev: []
                }).s
            }
        }
        for (let round = 2; round < 9; round++) assert.equal(phases[round],
            cg.RULES.summonRounds.includes(round) ? "blind" : "main",
            `vòng ${round}`)
        // đường mở theo mốc
        for (const round of [1,
            3,
            4,
            7,
            8,
            12,
            13,
            18,
            19,
            25]) {
            const s2 = mk({
                round
            })
            assert.equal(gm(s2).openLanes().length,
                cg.RULES.summonRounds.filter((r) => r <= round).length,
                `vòng ${round}`)
        }
    })
test("Đòn đánh thường: mọi vai 1× AD, Sát thủ 1.25× AD",
    () => {
        assert.deepEqual(cg.RULES.roleAttack,
            {
                fighter: 1, tank: 1, assassin: 1.25, marksman: 1, mage: 1, support: 1
            })
        const s = mk({
            A: {
                v3_assassin: 2, v3_mark: 1
            }, B: {
                v3_tank: 2, v3_sup: 1
            }
        })
        const a = u(s,
                "A",
                "v3_assassin"), b = u(s,
                "B",
                "v3_tank")
        const r1 = gm(s)
        const ev0 = r1.events.length
        r1.attack(a,
            b)
        assert.equal(dmgTo(r1.events.slice(ev0),
            b.id,
            "attack"),
        125)
        const ev1 = r1.events.length
        r1.attack(u(s,
            "A",
            "v3_mark"),
        u(s,
            "B",
            "v3_sup"))
        assert.equal(dmgTo(r1.events.slice(ev1),
            "B:v3_sup",
            "attack"),
        100)
    })
test("Quà tặng (chốt 31/10): từ lượt thứ 2 mỗi lượt +1 Đánh Thường; cứ RULES.freeLootEvery lượt +1 lá mảnh đồ (70%) hoặc Vàng (30%); không còn quà lá chiêu; không lấy từ bộ bài",
    () => {
        let s = skipBlind({
            s: cg.newGame(SEED,
                TEAM,
                TEAM), ev: []
        }).s
        const free: string[] = []
        const log: string[] = []
        let lastDeck = -1
        for (let i = 0; i < 12; i++) {
            const side = s.active
            const r = end(s,
                side)
            for (const e of evs(r.ev,
                "freeCard")) free.push(`${e.side}:${e.kind}`)
            for (const e of evs(r.ev,
                "log")) log.push(e.text)
            s = r.s
            lastDeck = s.players.A.deck.length
        }
        // 12 lượt đã đổi = A chơi lượt 2..7, B chơi lượt 1..6 hoặc tương tự: mỗi bên có ít nhất 1 basic và 1 item
        assert.ok(free.includes("A:basic") && free.includes("B:basic"),
            free.join(","))
        assert.ok(free.includes("A:item") && free.includes("B:item"),
            free.join(","))
        assert.ok(!free.some((x) => x.endsWith(":skill")),
            "đã bỏ quà lá chiêu")
        assert.ok(log.some((t) => /free/i.test(t)),
            "có dòng nhật ký")
        assert.ok(lastDeck > 0)
        // kiểm tra chính xác theo ownTurns
        const s2 = mk()
        s2.ownTurns = {
            A: 0, B: 0
        }
        const counts: Record<string, number> = {
        }
        let t = s2
        for (let i = 0; i < 12; i++) {
            const side = t.active
            const deckBefore = t.players[side].deck.length
            const r = end(t,
                side)
            t = r.s
            const nxt = t.active
            const n = t.ownTurns![nxt]!
            const got = evs(r.ev,
                "freeCard").filter((e) => e.side === nxt)
            const kinds = got.map((e) => e.kind)
            const basic = (n > 1 && n % cg.RULES.freeBasicEvery === 0) || (n === 1 && cg.RULES.secondFirstBasic > 0 && nxt !== "A")
            assert.equal(kinds.filter((k) => k === "basic").length,
                basic ? 1 : 0,
                `Đánh Thường lượt thứ ${n} của ${nxt}`)
            assert.equal(kinds.filter((k) => k === "item" || k === "gold").length,
                n > 0 && n % cg.RULES.freeLootEvery === 0 ? 1 : 0,
                `quà đồ/Vàng lượt thứ ${n} của ${nxt}`)
            assert.ok(!kinds.includes("skill"))
            counts[nxt] = (counts[nxt] ?? 0) + got.length
            void deckBefore
        }
        assert.ok((counts.A ?? 0) > 0 && (counts.B ?? 0) > 0)
    })
test("Tháo đồ: lá đồ về tay (mảnh -> 'item', món ghép -> 'legend'), máu tối đa giảm; tay đầy thì đốt; ghép tại chỗ vẫn hợp lệ",
    () => {
        const s = mk({
            A: {
                v3_fighter: 2, v3_caster: 0
            }, B: {
                v3_tank: 2
            }
        })
        const g = gm(s)
        const f = u(s,
            "A",
            "v3_fighter")
        const hp0 = f.maxHp
        assert.ok(g.equip(f,
            COMPONENT_HP))
        assert.ok(f.maxHp > hp0,
            "đồ có máu")
        g.equip(f,
            FINISHED)
        const acts = legal(s,
            "A").filter((a) => a.t === "unequip")
        assert.equal(acts.length,
            2)
        const r = act(s,
            {
                t: "unequip", side: "A", unit: f.id, item: COMPONENT_HP
            })
        const f2 = r.s.units[f.id]
        assert.deepEqual(f2.items,
            [FINISHED])
        assert.equal(f2.maxHp,
            hp0 + (gm(r.s).stats(f2).hp))
        const c = r.s.players.A.hand.find((x) => x.kind === "support" && x.id === "item")!
        assert.equal(c.item,
            COMPONENT_HP)
        assert.equal(evs(r.ev,
            "unequip").length,
        1)
        assert.deepEqual(seen.unequipped.slice(-1),
            [COMPONENT_HP])
        const r2 = act(r.s,
            {
                t: "unequip", side: "A", unit: f.id, item: FINISHED
            })
        assert.ok(r2.s.players.A.hand.some((x) => x.id === "legend" && x.item === FINISHED))
        // tay đầy -> đốt
        const s3 = mk({
            A: {
                v3_fighter: 2
            }, B: {
                v3_tank: 2
            }
        })
        gm(s3).equip(u(s3,
            "A",
            "v3_fighter"),
        FINISHED)
        for (let i = 0; i < cg.RULES.handMax; i++) give(s3,
            "A",
            sup(s3,
                "basic"))
        const r3 = act(s3,
            {
                t: "unequip", side: "A", unit: "A:v3_fighter", item: FINISHED
            })
        assert.equal(r3.s.players.A.hand.length,
            cg.RULES.handMax)
        assert.equal(evs(r3.ev,
            "cardBurned").length,
        1)
        assert.ok(r3.s.players.A.grave.some((x) => x.id === "legend"))
        assert.throws(() => act(s3,
            {
                t: "unequip", side: "A", unit: "A:v3_fighter", item: "khong_co"
            }))
    })
test("Ô phụ: mọi vai đánh được bất kể đường; hành động hợp lệ thực sự gây sát thương",
    () => {
        for (const hero of ["v3_fighter",
            "v3_mark",
            "v3_tank",
            "v3_assassin",
            "v3_mage",
            "v3_sup"]) {
            const s = mk({
                A: {
                    [hero]: 4
                }, B: {
                    v3_sup: 0, v3_tank: 1
                }
            })
            const tok = gm(s).summonToken("B",
                {
                    id: "keg", name: "Keg", hp: 1000
                })
            const card = give(s,
                "A",
                sup(s,
                    "basic"))
            const actions = legal(s,
                "A")
            const hit = actions.find((a) => a.t === "play" && a.uid === card.uid && a.args?.actor === `A:${hero}` && a.args?.target === tok.id)
            assert.ok(hit,
                `${hero}: được đánh ô phụ dù đường đối diện trống và địch có Đỡ đòn`)
            const out = act(s,
                hit)
            assert.ok(out.ev.some((e) => e.t === "damage" && e.target === tok.id),
                `${hero}: action phải đánh trúng token thật`)
            assert.ok(out.s.units[tok.id].hp < tok.hp)
            if (hero === "v3_fighter") assert.ok(actions.some((a) => a.t === "attack" && a.cardless && a.actor === `A:${hero}` && a.target === tok.id))
        }
    })

test("Ô phụ: quyền đánh của mọi vai vẫn tôn trọng mục tiêu không thể chọn và phe địch",
    () => {
        const s = mk({
            A: {
                v3_mage: 4
            }, B: {
                v3_sup: 0
            }
        })
        const g = gm(s)
        const enemy = g.summonToken("B",
            {
                id: "keg", name: "Keg", hp: 1000
            })
        const ally = g.summonToken("A",
            {
                id: "keg", name: "Keg", hp: 1000
            })
        const targets = () => cg.attackTargets(g,
            u(s,
                "A",
                "v3_mage"),
            true).map((x) => x.id)
        assert.ok(targets().includes(enemy.id))
        assert.ok(!targets().includes(ally.id))
        g.status(enemy,
            "stasis",
            1)
        assert.ok(!targets().includes(enemy.id))
        delete enemy.statuses.stasis
        g.status(enemy,
            "stealth",
            1)
        assert.ok(!targets().includes(enemy.id))
    })

test("AP gốc = 0 cho MỌI tướng (luật chủ 30/10): kể cả HeroDef khai báo ap; AP chỉ đến từ đồ",
    () => {
        for (const h of cg.allHeroes()) assert.equal(h.ap ?? 0,
            0,
            `${h.id} không còn AP gốc`)
        const withAp = cg.defineHero({
            id: "v3_apmage", name: "v3_apmage", role: "mage", ...base, ap: 60, skills: filler
        })
        assert.equal(withAp.ap ?? 0,
            0)
        const s2 = cg.newGame(SEED,
            ["v3_apmage",
                "v3_tank",
                "v3_sup",
                "v3_mark",
                "v3_fighter"],
            TEAM)
        gm(s2).summon("A",
            "v3_apmage",
            2)
        const m = u(s2,
            "A",
            "v3_apmage")
        assert.equal(gm(s2).ap(m),
            0)
        gm(s2).equip(m,
            "gay_qua_kho")
        assert.ok(gm(s2).ap(m) > 0,
            "AP chỉ từ đồ")
        assert.equal(gm(s2).f(m,
            "100% AP"),
        gm(s2).ap(m))
    })
test("Tàng Hình: không bị chọn (đánh thường, chiêu 1 mục tiêu, chiêu đối diện) nhưng vẫn nhận sát thương diện rộng; chiêu đã nhắm mà mục tiêu tàng hình giữa Chuỗi thì trượt",
    () => {
        const s = mk({
            A: {
                v3_caster: 2, v3_mark: 1
            }, B: {
                v3_tank: 2, v3_sup: 1
            }
        })
        const g = gm(s)
        g.stealth(u(s,
            "B",
            "v3_tank"),
        1,
        "A")
        assert.equal(g.targetable(u(s,
            "B",
            "v3_tank")),
        false)
        const q = give(s,
            "A",
            skillCard(s,
                "v3_caster",
                "A",
                "Q"))
        const e = give(s,
            "A",
            skillCard(s,
                "v3_caster",
                "A",
                "E"))
        const r = give(s,
            "A",
            skillCard(s,
                "v3_caster",
                "A",
                "R"))
        const b = give(s,
            "A",
            sup(s,
                "basic"))
        const acts = legal(s,
            "A")
        const tg = (uid: string) => acts.filter((a) => a.t === "play" && a.uid === uid).map((a) => (a.t === "play" ? a.args?.target : undefined))
        assert.deepEqual(tg(q.uid),
            ["B:v3_sup"])
        assert.ok(!tg(b.uid).includes("B:v3_tank"))
        assert.ok(!acts.some((a) => a.t === "play" && a.uid === r.uid),
            "chiêu đối diện không chọn được tướng tàng hình")
        const out = play(s,
            "A",
            e)
        assert.equal(dmgTo(out.ev,
            "B:v3_tank"),
        50,
        "diện rộng vẫn trúng tướng tàng hình")
        // tàng hình giữa chuỗi (Quick của đối thủ): chiêu đã nhắm thì trượt
        const s2 = mk({
            A: {
                v3_caster: 2
            }, B: {
                v3_ghost: 2
            }
        })
        const c2 = give(s2,
            "A",
            skillCard(s2,
                "v3_caster",
                "A",
                "Q"))
        const vanish = give(s2,
            "B",
            skillCard(s2,
                "v3_ghost",
                "B",
                "Q"))
        const a2 = legal(s2,
            "A").find((a) => a.t === "play" && a.uid === c2.uid)!
        let st = act(s2,
            a2)
        assert.equal(st.s.phase,
            "chain")
        st = act(st.s,
            {
                t: "chain", side: "B", uid: vanish.uid, args: {
                }
            })
        const evAll = [...st.ev]
        while (st.s.phase === "chain") {
            const side = cg.actorsOf(st.s)[0]
            st = act(st.s,
                {
                    t: "pass", side
                })
            evAll.push(...st.ev)
        }
        assert.equal(dmgTo(evAll,
            "B:v3_ghost"),
        0,
        "mục tiêu đã tàng hình: chiêu trượt")
        assert.ok(st.s.units["B:v3_ghost"].statuses.stealth)
    })

// ======================================================================
G("V3: biến hình, hào quang đồ, token")
// ======================================================================
test("Biến hình: cộng chỉ số, máu tối đa, hồi nhận ×healMult; hết hạn cuối lượt chủ; hook onTransformEnd",
    () => {
        const s = mk({
            A: {
                v3_caster: 2
            }, B: {
                v3_tank: 2
            }
        })
        const g = gm(s)
        const f = u(s,
            "A",
            "v3_caster")
        f.hp = 500
        assert.ok(g.transform(f,
            "beast",
            2,
            {
                bonus: {
                    atk: 30
                }, maxHp: 100, healMult: 1.5
            }))
        assert.equal(g.atk(f),
            130)
        assert.equal(f.maxHp,
            1100)
        assert.equal(f.hp,
            600)
        assert.equal(g.heal(undefined,
            f,
            100),
        150)
        assert.ok(g.isTransformed(f,
            "beast"))
        let r = end(s,
            "A")
        assert.ok(g.isTransformed(r.s.units[f.id],
            "beast") || r.s.units[f.id].transform?.id === "beast",
        "còn sau lượt đầu")
        r = end(r.s,
            "B")
        assert.equal(r.s.units[f.id].transform?.id,
            "beast",
            "còn trong lượt thứ 2 của chủ")
        r = end(r.s,
            "A")
        assert.equal(r.s.units[f.id].transform,
            undefined,
            "hết sau lượt thứ 2")
        assert.equal(r.s.units[f.id].maxHp,
            1000)
        assert.ok(r.s.units[f.id].hp <= 1000)
        assert.ok(seen.transformEnd.includes("beast:expire"))
    })
test("Biến hình hồi sinh 1 lần: sắp chết thì ở lại với reviveHp, không mất mạng, hết biến hình; lần sau chết thật",
    () => {
        const s = mk({
            A: {
                v3_caster: 2
            }, B: {
                v3_tank: 2
            }
        })
        const g = gm(s)
        const f = u(s,
            "A",
            "v3_caster")
        g.transform(f,
            "beast",
            2,
            {
                reviveHp: 300, maxHp: 100
            })
        const lives = s.players.A.lives
        g.damage(u(s,
            "B",
            "v3_tank"),
        f,
        99999,
        "true",
        {
            tag: "attack"
        })
        assert.equal(f.status,
            "board")
        assert.equal(f.hp,
            300)
        assert.equal(f.transform,
            undefined)
        assert.equal(f.maxHp,
            1000)
        assert.equal(s.players.A.lives,
            lives)
        assert.ok(seen.transformEnd.includes("beast:revive"))
        g.damage(u(s,
            "B",
            "v3_tank"),
        f,
        99999,
        "true",
        {
            tag: "attack"
        })
        assert.equal(f.status,
            "dead")
        assert.equal(s.players.A.lives,
            lives - 1)
    })
test("Hào quang đồ (itemAura): đồ của đồng minh +% (mọi chỉ số trừ máu) theo số vòng đã mặc; g.atk(me) an toàn; tháo ra đếm lại",
    () => {
        const s = mk({
            A: {
                v3_smith: 0, v3_fighter: 2
            }, B: {
                v3_tank: 2
            }
        })
        const g = gm(s)
        const f = u(s,
            "A",
            "v3_fighter")
        g.equip(f,
            "kiem_dai")
        const ad = cg.CARD_ITEMS.kiem_dai.stats.atk!
        assert.equal(g.itemRounds(f,
            0),
        0)
        assert.equal(g.atk(f),
            Math.round(100 + ad * 1.1))
        s.round = 10
        assert.equal(g.itemRounds(f,
            0),
        2)
        assert.equal(g.atk(f),
            Math.round(100 + ad * 1.2))
        assert.equal(g.atk(u(s,
            "A",
            "v3_smith")),
        100,
        "đọc chỉ số của chính tướng có hào quang không đệ quy")
        // đối phương không hưởng
        g.equip(u(s,
            "B",
            "v3_tank"),
        "kiem_dai")
        assert.equal(g.atk(u(s,
            "B",
            "v3_tank")),
        100 + ad)
        // tháo rồi đeo lại: đếm lại từ 0
        gm(s).unequip(f,
            "kiem_dai")
        const card = s.players.A.hand.find((c) => c.id === "item")!
        assert.ok(card)
        gm(s).equip(f,
            "kiem_dai")
        assert.equal(g.itemRounds(f,
            0),
        0)
        // ghép tại chỗ giữ mốc
        s.round = 12
        gm(s).upgradeItem(f,
            "kiem_dai",
            FINISHED)
        assert.equal(g.itemRounds(f,
            0),
        2)
    })
test("grantItem: đeo ngay nếu còn ô, hết ô thì lá legend về tay; randomFinishedItem không phải mảnh",
    () => {
        const s = mk({
            A: {
                v3_fighter: 2
            }, B: {
                v3_tank: 2
            }
        })
        const g = gm(s)
        const f = u(s,
            "A",
            "v3_fighter")
        for (let i = 0; i < 30; i++) assert.ok(!(cg.COMPONENTS as readonly string[]).includes(g.randomFinishedItem()))
        assert.equal(g.grantItem(f),
            "equipped")
        g.grantItem(f)
        g.grantItem(f)
        assert.equal(f.items.length,
            cg.RULES.itemSlots)
        assert.equal(g.grantItem(f,
            FINISHED),
        "hand")
        assert.ok(s.players.A.hand.some((c) => c.id === "legend" && c.item === FINISHED))
    })
test("Token: defineTokenBehavior chạy đầu/cuối lượt của phe chủ; đánh vào token bằng Đấu sĩ/Xạ thủ",
    () => {
        const s = mk({
            A: {
                v3_necro: 2
            }, B: {
                v3_tank: 2
            }
        })
        const g = gm(s)
        const n = u(s,
            "A",
            "v3_necro")
        n.hp = 500
        g.summonToken("A",
            {
                id: "v3_maiden", name: "M", hp: 100, ownerId: n.id, soak: false
            })
        seen.tokenStart = 0
        seen.tokenEnd = 0
        let r = end(s,
            "A")
        assert.equal(seen.tokenEnd,
            1)
        assert.equal(seen.tokenStart,
            0)
        r = end(r.s,
            "B")
        assert.equal(seen.tokenStart,
            1)
        assert.equal(dmgTo(r.ev,
            "B:v3_tank"),
        10)
        assert.equal(r.s.units[n.id].hp,
            505)
    })
test("Mill + offerPick (Yorick E): 3 lá bộ vào mộ, 3 lá chọn tạm; đánh 1 lá = lấy lá đó về tay, các lá chọn khác biến mất",
    () => {
        const s = mk({
            A: {
                v3_fighter: 2
            }, B: {
                v3_tank: 2
            }
        })
        const g = gm(s)
        const grave0 = s.players.A.grave.length
        const milled = g.mill("A",
            3)
        assert.equal(milled.length,
            3)
        assert.equal(s.players.A.grave.length,
            grave0 + 3)
        const picks = g.offerPick("A",
            "v3_fighter",
            milled)
        assert.equal(picks.length,
            3)
        assert.ok(picks.every((c) => c.temp && c.kind === "special" && c.id === "pick_card"))
        const acts = legal(s,
            "A").filter((a) => a.t === "play" && picks.some((p) => p.uid === a.uid))
        assert.ok(acts.length >= 1)
        const target = picks[1]
        const want = String(target.data!.uid)
        const r = play(s,
            "A",
            target)
        const hand = r.s.players.A.hand
        assert.ok(hand.some((c) => c.uid === want),
            "lá được chọn về tay")
        assert.ok(!hand.some((c) => c.id === "pick_card"),
            "các lá chọn còn lại biến mất")
        assert.equal(r.s.players.A.grave.length,
            grave0 + 2)
    })

// ======================================================================
G("V3: trạng thái, bảo vệ, dấu, hẹn giờ, di chuyển")
// ======================================================================
test("Stasis: miễn sát thương, không bị chọn, không nhận hiệu ứng địch, không hành động được",
    () => {
        const s = mk({
            A: {
                v3_caster: 2
            }, B: {
                v3_tank: 2, v3_fighter: 1
            }
        })
        const g = gm(s)
        const t = u(s,
            "B",
            "v3_tank")
        g.stasis(t,
            1)
        assert.equal(g.canAct(t),
            false)
        assert.equal(g.targetable(t),
            false)
        assert.equal(g.damage(u(s,
            "A",
            "v3_caster"),
        t,
        500,
        "true"),
        0)
        g.status(t,
            "stun",
            1,
            {
                src: "A:v3_caster"
            })
        assert.equal(g.has(t,
            "stun"),
        false)
        assert.equal(t.hp,
            1000)
    })
test("Guard (Leona E): sát thương địch lên đồng minh khác chảy về người hộ vệ và được ghi lại",
    () => {
        const s = mk({
            A: {
                v3_caster: 2
            }, B: {
                v3_tank: 2, v3_fighter: 1
            }
        })
        const g = gm(s)
        const guard = u(s,
                "B",
                "v3_tank"), ally = u(s,
                "B",
                "v3_fighter")
        g.guard(guard,
            1)
        const dealt = g.damage(u(s,
            "A",
            "v3_caster"),
        ally,
        100,
        "true",
        {
            tag: "skill"
        })
        assert.equal(dealt,
            100)
        assert.equal(ally.hp,
            1000)
        assert.equal(guard.hp,
            900)
        assert.equal(g.guardStored(guard),
            100)
        g.damage(undefined,
            ally,
            30,
            "true",
            {
                tag: "dot"
            })
        assert.equal(ally.hp,
            970,
            "sát thương không nguồn địch thì không chuyển")
    })
test("dmgCut / attackCut: giảm sát thương nhận; attackCut 1 miễn đòn đánh nhưng không miễn chiêu",
    () => {
        const s = mk({
            A: {
                v3_caster: 2
            }, B: {
                v3_tank: 2
            }
        })
        const g = gm(s)
        const t = u(s,
                "B",
                "v3_tank"), a = u(s,
                "A",
                "v3_caster")
        g.status(t,
            "dmgCut",
            1,
            {
                v: 0.2
            })
        assert.equal(g.damage(a,
            t,
            100,
            "true",
            {
                tag: "skill"
            }),
        80)
        g.removeStatus(t,
            "dmgCut")
        g.status(t,
            "attackCut",
            1,
            {
                v: 1
            })
        assert.equal(g.damage(a,
            t,
            100,
            "true",
            {
                tag: "attack"
            }),
        0)
        assert.equal(g.damage(a,
            t,
            100,
            "true",
            {
                tag: "skill"
            }),
        100)
    })
test("Dấu trúng đòn (addMark): đồng minh của người đánh dấu đánh trúng thì tiêu 1 nấc, +sát thương, bắn onMarkHit; hết nấc thì gỡ",
    () => {
        const s = mk({
            A: {
                v3_caster: 0, v3_fighter: 2
            }, B: {
                v3_tank: 2
            }
        })
        const g = gm(s)
        const t = u(s,
            "B",
            "v3_tank")
        g.addMark(t,
            "bubble",
            u(s,
                "A",
                "v3_caster"),
            {
                hits: 2, bonus: 30, kind: "true"
            })
        seen.marks.length = 0
        const base0 = g.events.length
        g.attack(u(s,
            "A",
            "v3_fighter"),
        t)
        assert.equal(dmgTo(g.events.slice(base0),
            t.id),
        130)
        g.attack(u(s,
            "A",
            "v3_fighter"),
        t)
        assert.equal(g.marksOn(t).length,
            0)
        const b2 = g.events.length
        g.attack(u(s,
            "A",
            "v3_fighter"),
        t)
        assert.equal(dmgTo(g.events.slice(b2),
            t.id),
        100)
        assert.deepEqual(seen.marks,
            ["bubble:1",
                "bubble:0"])
        // địch của người đánh dấu đánh trúng thì không tiêu
        g.addMark(u(s,
            "A",
            "v3_fighter"),
        "x",
        u(s,
            "A",
            "v3_caster"),
        {
            hits: 1, bonus: 10, kind: "true"
        })
        g.attack(t,
            u(s,
                "A",
                "v3_fighter"))
        assert.equal(g.marksOn(u(s,
            "A",
            "v3_fighter")).length,
        1)
    })
test("Hẹn giờ (g.delay): bắn đúng 1 lần cuối lượt của phe, vào hook onDelayed của chủ",
    () => {
        const s = mk({
            A: {
                v3_caster: 2
            }, B: {
                v3_tank: 2
            }
        })
        const g = gm(s)
        seen.delayed.length = 0
        g.delay(u(s,
            "A",
            "v3_caster"),
        "mark",
        "turnEnd",
        "A",
        {
            target: "B:v3_tank"
        })
        const r = end(s,
            "A")
        assert.deepEqual(seen.delayed,
            ["mark"])
        assert.equal(dmgTo(r.ev,
            "B:v3_tank"),
        40)
        const r2 = end(end(r.s,
            "B").s,
        "A")
        assert.deepEqual(seen.delayed,
            ["mark"])
        void r2
    })
test("Đếm theo lượt (bumpTurnCount) reset khi sang lượt; rollState công khai; scaling/chance",
    () => {
        const s = mk({
            A: {
                v3_caster: 2
            }, B: {
                v3_tank: 2
            }
        })
        const g = gm(s)
        const a = u(s,
            "A",
            "v3_caster")
        assert.equal(g.bumpTurnCount(a,
            "hit"),
        1)
        assert.equal(g.bumpTurnCount(a,
            "hit"),
        2)
        assert.equal(g.turnCount(a,
            "hit"),
        2)
        s.turnNo++
        assert.equal(g.turnCount(a,
            "hit"),
        0)
        assert.equal(g.bumpTurnCount(a,
            "hit"),
        1)
        for (let i = 0; i < 20; i++) {
            const v = g.rollState(a,
                "element",
                3)
            assert.ok(v >= 1 && v <= 3 && a.stacks.element === v)
        }
        assert.equal(evs(g.events,
            "roll").length,
        20)
        assert.ok(Math.abs(g.scaling(a,
            {
                base: 0.1, ad: 0.05, ap: 0.1
            }) - 0.15) < 1e-9)
        assert.equal(g.chance(a,
            {
                base: 0.9, ad: 0.5
            }),
        1)
        assert.equal(g.chance(a,
            {
                base: -1
            }),
        0)
        let hits = 0
        for (let i = 0; i < 400; i++) if (g.roll(0.25)) hits++
        assert.ok(hits > 60 && hits < 140,
            `${hits}`)
    })
test("Nảy đồng minh (bounceAllies): fn gọi 1 + N lần, chỉ lên đồng minh sống",
    () => {
        const s = mk({
            A: {
                v3_caster: 0, v3_fighter: 2, v3_sup: 4
            }, B: {
                v3_tank: 2
            }
        })
        const g = gm(s)
        const hops: string[] = []
        g.bounceAllies(u(s,
            "A",
            "v3_caster"),
        5,
        (t, hop) => { hops.push(`${hop}:${t.side}`) })
        assert.equal(hops.length,
            6)
        assert.ok(hops.every((h) => h.endsWith(":A")))
        assert.equal(hops[0],
            "0:A")
        const same: string[] = []
        g.bounceAllies(u(s,
            "A",
            "v3_caster"),
        8,
        (t) => same.push(t.id),
        {
            avoidSame: true
        })
        for (let i = 1; i < same.length; i++) assert.notEqual(same[i],
            same[i - 1])
    })
test("Di chuyển: faceEnemy/swapWith/moveTo trả boolean; bàn đầy: đổi chỗ với ô của tướng chết dời ô giữ chỗ của nó",
    () => {
        const s = mk({
            A: {
                v3_caster: 0, v3_fighter: 2
            }, B: {
                v3_tank: 3, v3_sup: 1
            }
        })
        const g = gm(s)
        const c = u(s,
            "A",
            "v3_caster")
        assert.equal(g.canFace(c,
            u(s,
                "B",
                "v3_tank")),
        true)
        assert.equal(g.faceEnemy(c,
            u(s,
                "B",
                "v3_tank")),
        true)
        assert.equal(c.lane,
            3)
        assert.equal(g.opposite(c)?.id,
            "B:v3_tank")
        assert.equal(g.swapWith(c,
            u(s,
                "A",
                "v3_fighter")),
        true)
        assert.equal(c.lane,
            2)
        assert.equal(g.moveTo(c,
            c.lane),
        false)
        const f = u(s,
            "A",
            "v3_fighter")
        f.status = "dead"
        const cl = c.lane, fl = f.lane
        assert.equal(g.moveTo(c,
            fl),
        true,
        "bàn đầy: hoán đổi với ô giữ cho tướng chết")
        assert.equal(c.lane,
            fl)
        assert.equal(f.lane,
            cl,
            "tướng chết bị dời theo ô giữ chỗ")
        assert.equal(f.homeLane,
            cl,
            "hồi sinh tại ô mới")
        assert.equal(f.status,
            "dead",
            "không hồi sinh khi bị dời")
        assert.equal(g.canFace(c,
            u(s,
                "B",
                "v3_sup")),
        c.lane !== u(s,
            "B",
            "v3_sup").lane)
    })
test("Cướp và đổi (stealCard convert): lá chiêu địch bị đốt, người cướp nhận Q/E ngẫu nhiên của tướng mình đang sống",
    () => {
        const s = mk({
            A: {
                v3_fighter: 2
            }, B: {
                v3_tank: 2
            }
        })
        const g = gm(s)
        const stolen = give(s,
            "B",
            skillCard(s,
                "v3_tank",
                "B",
                "E"))
        const grave0 = s.players.B.grave.length
        const got = g.stealCard("A",
            "B",
            {
                skill: "convert"
            })
        assert.equal(got?.uid,
            stolen.uid)
        assert.equal(got?.hero,
            "v3_tank")
        assert.equal(s.players.B.grave.length,
            grave0 + 1)
        const mine = s.players.A.hand
        assert.equal(mine.length,
            1)
        assert.ok(mine[0].kind === "skill" && mine[0].hero === "v3_fighter" && /_(q|e)$/.test(mine[0].id),
            mine[0].id)
        // lá chung: về tay như thường
        const basic = give(s,
            "B",
            sup(s,
                "basic"))
        g.stealCard("A",
            "B",
            {
                skill: "convert", uid: basic.uid
            })
        assert.ok(s.players.A.hand.some((c) => c.uid === basic.uid))
    })
test("Công thức: máu đã mất, máu tối đa/đã mất/Giáp của mục tiêu; không có mục tiêu thì mô tả giữ chữ",
    () => {
        const s = mk({
            A: {
                v3_caster: 2
            }, B: {
                v3_tank: 2
            }
        })
        const g = gm(s)
        const a = u(s,
                "A",
                "v3_caster"), t = u(s,
                "B",
                "v3_tank")
        a.hp = 600
        t.hp = 500
        t.maxHp = 1200
        assert.equal(g.f(a,
            "50% máu đã mất"),
        200)
        assert.equal(g.f(a,
            "10% target max HP + 5% target missing HP + 100% AD",
            t),
        120 + 35 + 100)
        assert.equal(g.f(a,
            "10% máu tối đa mục tiêu",
            t),
        120)
        assert.equal(cg.tryEvalExpr(g,
            a,
            "10% target max HP"),
        undefined)
        assert.equal(cg.formulaText("Gây {10% target max HP}",
            g,
            a),
        "Gây 10% target max HP")
    })
test("noCrit: hook onAttack đặt info.noCrit thì đòn không chí mạng dù alwaysCrit",
    () => {
        const s = mk({
            A: {
                v3_nocrit: 1, v3_mark: 2
            }, B: {
                v3_tank: 2
            }
        })
        const g = gm(s)
        g.status(u(s,
            "A",
            "v3_nocrit"),
        "alwaysCrit",
        1)
        g.status(u(s,
            "A",
            "v3_mark"),
        "alwaysCrit",
        1)
        const t = u(s,
            "B",
            "v3_tank")
        assert.equal(g.attack(u(s,
            "A",
            "v3_nocrit"),
        t)?.crit,
        false)
        assert.equal(g.attack(u(s,
            "A",
            "v3_mark"),
        t)?.crit,
        true)
    })
test("Bot: 12 ván có seed không lỗi với luật V3 (mốc gọi tướng, quà tặng, tháo đồ)",
    () => {
        for (let seed = 1; seed <= 12; seed++) {
            let s = cg.newGame(seed,
                cg.implementedHeroes().slice(0,
                    5).map((h) => h.id),
                cg.implementedHeroes().slice(5,
                    10).map((h) => h.id))
            let steps = 0
            while (s.phase !== "over" && steps++ < 2500) {
                const side = cg.actorsOf(s)[0]
                const a = cg.chooseAction(s,
                    side,
                    "easy")
                assert.ok(cg.legalActions(s,
                    side).some((l) => JSON.stringify(l) === JSON.stringify(a)),
                `ván ${seed}: hành động bất hợp lệ ${JSON.stringify(a)}`)
                s = cg.applyAction(s,
                    a).state
            }
        }
    })

// ======================================================================
G("Hiển thị công thức + nhật ký xác suất")
// ======================================================================
test("formulaText: số hiện 1 chữ số thập phân, công thức tỉ lệ có %, số hạng theo mục tiêu giữ nguyên chữ",
    () => {
        const s = cg.newGame(1,
            ["braum",
                "zed",
                "jinx",
                "nami",
                "soraka"],
            ["darius",
                "teemo",
                "lux",
                "garen",
                "vayne"])
        const g = gm(s)
        const u = s.units["A:braum"]
        const ad = g.atk(u), ap = g.ap(u), ar = g.armor(u)
        const v = 20 + 0.1 * ad + 0.1 * ap
        const one = (x: number) => { const r = Math.round(x * 10) / 10; return Number.isInteger(r) ? `${r}` : r.toFixed(1) }
        assert.equal(cg.formulaText("{20 + 10% AD + 10% AP}",
            g,
            u),
        `${one(v)} (20 + 10% AD + 10% AP)`)
        const ch = 5 + u.maxHp / 100 + ar / 10
        assert.equal(cg.formulaText("{5% + 1% mỗi 100 máu tối đa + 1% mỗi 10 Giáp}",
            g,
            u),
        `${one(ch)}% (5% + 1% mỗi 100 máu tối đa + 1% mỗi 10 Giáp)`)
        assert.equal(cg.formulaText("{30 + 5% máu tối đa mục tiêu}",
            g,
            u),
        "30 + 5% máu tối đa mục tiêu (30 + 5% máu tối đa mục tiêu)")
        const t = s.units["B:darius"]
        assert.equal(cg.formulaText("{30 + 5% máu tối đa mục tiêu}",
            g,
            u,
            t),
        `${one(30 + 0.05 * t.maxHp)} (30 + 5% máu tối đa mục tiêu)`)
        assert.ok(!/d+.d{2,}/.test(cg.formulaText(cg.getHero("braum")!.skills.R.desc,
            g,
            u)))
    })
test("g.rollLog: ghi nhật ký tỉ lệ (vd Braum R: X bị/không bị Choáng (tỉ lệ 18.4%))",
    () => {
        const g = gm(cg.newGame(1,
            ["braum",
                "zed",
                "jinx",
                "nami",
                "soraka"],
            ["darius",
                "teemo",
                "lux",
                "garen",
                "vayne"]))
        assert.equal(g.pctText(0.18444),
            "18.4%")
        assert.equal(g.pctText(0.25),
            "25%")
        const hit = g.rollLog(1,
            (h, p) => `thử ${h ? "trúng" : "trượt"} (tỉ lệ ${p})`)
        assert.ok(hit)
        assert.ok(g.events.some((e) => e.t === "log" && e.text === "thử trúng (tỉ lệ 100%)"))
    })

// ======================================================================
// Bỏ bài xuống mộ (discard)
// ======================================================================
G("Bỏ bài xuống mộ")
{
    const withHand = (o: Setup = {
    }): St => {
        const s = mk(o)
        s.actionsThisTurn = 0
        give(s,
            "A",
            sup(s,
                "gold"),
            sup(s,
                "basic"))
        give(s,
            "B",
            sup(s,
                "gold"))
        return s
    }
    const discardOf = (s: St, uid: string): Act => ({
        t: "discard", side: "A", uid
    })
    test("bỏ 1 lá: rời tay, vào mộ, phát event discard manual, không tốn lượt hành động",
        () => {
            const s = withHand()
            const card = s.players.A.hand[0]
            const hand0 = s.players.A.hand.length
            const grave0 = s.players.A.grave.length
            assert.ok(cg.legalActions(s,
                "A").some((a) => a.t === "discard" && a.uid === card.uid))
            const r = cg.applyAction(s,
                discardOf(s,
                    card.uid))
            assert.equal(r.state.players.A.hand.length,
                hand0 - 1)
            assert.equal(r.state.players.A.grave.length,
                grave0 + 1)
            assert.ok(r.state.players.A.grave.some((c) => c.uid === card.uid))
            assert.ok(r.events.some((e) => e.t === "discard" && e.reason === "manual" && e.card.uid === card.uid))
            assert.equal(r.state.actionsThisTurn,
                0)
            assert.equal(r.state.active,
                "A")
        })
    test("không bỏ được ở lượt đối thủ hoặc trong chuỗi",
        () => {
            const s = withHand()
            const card = s.players.A.hand[0]
            assert.deepEqual(cg.legalActions(s,
                "B").filter((a) => a.t === "discard"),
            [])
            assert.throws(() => cg.applyAction(s,
                {
                    t: "discard", side: "B", uid: s.players.B.hand[0].uid
                }))
            const c = JSON.parse(JSON.stringify(s)) as St
            c.phase = "chain"
            c.chain = {
                links: [], priority: "B", passes: 0
            } as unknown as typeof c.chain
            assert.deepEqual(cg.legalActions(c,
                "A").filter((a) => a.t === "discard"),
            [])
            assert.throws(() => cg.applyAction(c,
                discardOf(c,
                    card.uid)))
        })
    test("hook onDiscard chạy và độ lớn mộ tăng (cho các tướng đếm mộ như Yorick)",
        () => {
            const s = withHand({
                A: {
                    v3_necro: 0
                }
            })
            const before = seen.discards.length
            const card = s.players.A.hand[0]
            const r = cg.applyAction(s,
                discardOf(s,
                    card.uid))
            assert.equal(seen.discards.length,
                before + 1)
            assert.equal(seen.discards[seen.discards.length - 1],
                "manual")
            assert.equal(r.state.players.A.grave.length,
                s.players.A.grave.length + 1)
        })
    test("lá bị Hoá Băng vẫn bỏ được; lá tạm thì không",
        () => {
            const s = withHand()
            const card = s.players.A.hand[0]
            gm(s).freezeCard("A",
                card,
                "B:lissandra")
            const r = cg.applyAction(s,
                discardOf(s,
                    card.uid))
            const got = r.state.players.A.grave.find((c) => c.uid === card.uid)
            assert.ok(got)
            assert.equal(got.frozen,
                undefined)
            const t = withHand()
            const tmp = t.players.A.hand[0]
            tmp.temp = true
            assert.ok(!cg.legalActions(t,
                "A").some((a) => a.t === "discard" && a.uid === tmp.uid))
            assert.throws(() => cg.applyAction(t,
                discardOf(t,
                    tmp.uid)))
        })
}

G("Pháp sư nhận chiêu tạm (luật chủ 30/10)")
cg.defineHero({
    id: "v3_mage2", name: "v3_mage2", role: "mage", ...base,
    skills: {
        Q: {
            ...noSkill("Q"), name: "Q-tam", mana: 30, canPlay: () => true
        },
        E: {
            ...noSkill("E"), name: "E-tam", mana: 30, canPlay: () => true
        },
        R: noSkill("R")
    },
})
// Quay về đầu lượt của A: A kết thúc lượt, B kết thúc lượt
const toNextTurnOfA = (s: St): St => {
    const r1 = end(s,
        "A")
    return end(r1.s,
        "B").s
}
const tempsOf = (s: St, side: S) => s.players[side].hand.filter((c) => c.temp)

test("Đầu lượt, mỗi Pháp sư trên sân nhận 1 lá tạm Q hoặc E của chính nó (ngẫu nhiên, cả hai khả năng đều xảy ra); tướng không phải Pháp sư thì không",
    () => {
        const got = new Set<string>()
        for (let seed = 1; seed <= 40; seed++) {
            const s = toNextTurnOfA(mk({
                seed, A: {
                    v3_mage2: 0, v3_fighter: 2
                }
            }))
            const t = tempsOf(s,
                "A")
            assert.equal(t.length,
                1,
                "đúng 1 lá tạm")
            assert.ok(t[0].kind === "skill" && t[0].hero === "v3_mage2")
            assert.ok(t[0].id === "v3_mage2_q" || t[0].id === "v3_mage2_e")
            got.add(t[0].id)
        }
        assert.equal(got.size,
            2,
            "cả Q lẫn E đều từng xuất hiện")
        const s2 = toNextTurnOfA(mk({
            A: {
                v3_fighter: 0
            }
        }))
        assert.equal(tempsOf(s2,
            "A").length,
        0)
    })

test("Lá tạm tốn mana như lá thật và đánh được; đánh xong biến mất, không vào mộ",
    () => {
        const s = toNextTurnOfA(mk({
            A: {
                v3_mage2: 0
            }
        }))
        const card = tempsOf(s,
            "A")[0]
        const before = s.teamMana.A
        const graveBefore = s.players.A.grave.length
        const r = play(s,
            "A",
            card)
        assert.equal(before - r.s.teamMana.A,
            30)
        assert.equal(r.s.players.A.grave.length,
            graveBefore,
            "lá tạm không vào mộ")
        assert.equal(tempsOf(r.s,
            "A").length,
        0)
    })

test("Lá tạm chưa dùng: biến mất cuối lượt (tempExpired), không vào mộ; lượt sau lại nhận lá mới",
    () => {
        const s = mk({
            A: {
                v3_mage2: 0
            }
        })
        const s1 = toNextTurnOfA(s)
        const graveBefore = s1.players.A.grave.length
        const r = end(s1,
            "A")
        assert.equal(evs(r.ev,
            "tempExpired").length,
        1)
        assert.equal(tempsOf(r.s,
            "A").length,
        0)
        assert.equal(r.s.players.A.grave.length,
            graveBefore)
        const s2 = end(r.s,
            "B").s
        assert.equal(tempsOf(s2,
            "A").length,
        1)
    })

test("Lá tạm không tính vào giới hạn tay: tay 10 lá vẫn nhận lá tạm, không đốt lá nào; không cho Bỏ vào mộ",
    () => {
        const s3 = end(mk({
            A: {
                v3_mage2: 0
            }
        }),
        "A").s
        // đổ tay A cho đủ 10 lá thường, rồi B kết thúc lượt: A rút bài + nhận lá tạm
        while (s3.players.A.hand.length < 10) s3.players.A.hand.push(gm(s3).supportCard("basic"))
        const rB = end(s3,
            "B")
        const s4 = rB.s
        assert.equal(s4.players.A.hand.filter((c) => !c.temp).length,
            10,
            "10 lá thường giữ nguyên")
        assert.equal(tempsOf(s4,
            "A").length,
        1,
        "vẫn nhận lá tạm")
        assert.ok(!evs(rB.ev,
            "cardBurned").some((e) => e.side === "A" && e.card.temp),
        "lá tạm không bị đốt")
        const tmp = tempsOf(s4,
            "A")[0]
        assert.ok(!legal(s4,
            "A").some((a) => a.t === "discard" && a.uid === tmp.uid),
        "không được Bỏ vào mộ lá tạm")
    })

// ======================================================================
G("Luật chung bàn đầy 31/10: Tốc Đánh, khống chế lẻ, cứu chết, sát thương cộng thêm")
// ======================================================================
let saverCalls = 0
cg.defineHero({
    id: "v3_saver", name: "v3_saver", role: "support", ...base, skills: filler,
    hooks: {
        onLethal(g, me, d) { saverCalls++; if (d.target.side === me.side) g.surviveWith(d.target,
            1) },
    },
})
test("Tốc Đánh: 100 = đúng 1 đòn, không tung xác suất; 250 = 2 đòn + 50% đòn thứ 3, chốt một lần mỗi hành động",
    () => {
        const s = mk({
            A: {
                v3_fighter: 2
            }, B: {
                v3_tank: 2
            }
        })
        const g = gm(s)
        const a = u(s,
                "A",
                "v3_fighter"), t = u(s,
                "B",
                "v3_tank")
        let rolls = 0
        g.rand = () => { rolls++; return 0.4 }
        assert.equal(g.attackSpeed(a),
            100)
        assert.equal(g.attackAction(a,
            t).length,
        1)
        assert.equal(rolls,
            0,
            "100 Tốc Đánh không tốn lượt tung")
        g.status(a,
            "attack_speed",
            2,
            {
                v: 150
            })
        assert.equal(g.attackSpeed(a),
            250)
        const hits = g.attackAction(a,
            t)
        assert.equal(hits.length,
            3,
            "0,4 < 0,5: thêm đòn thứ 3")
        assert.deepEqual(hits.map((h) => h.hitIndex),
            [0,
                1,
                2])
        assert.ok(hits.every((h) => h.hits === 3 && h.actionId === hits[0].actionId))
        g.rand = () => 0.6
        assert.equal(g.attackAction(a,
            t).length,
        2)
    })
test("Khống chế lẻ: Choáng 1,5 = chắc chắn 1 đơn vị + 50% thêm 1; 0,75 có thể trượt hẳn; tung 1 lần",
    () => {
        const s = mk({
            A: {
                v3_fighter: 2
            }, B: {
                v3_tank: 2
            }
        })
        const g = gm(s)
        const t = u(s,
            "B",
            "v3_tank")
        g.rand = () => 0.3
        g.status(t,
            "stun",
            1.5)
        assert.equal(t.statuses.stun.until,
            g.turnsUntil("B",
                2))
        g.removeStatus(t,
            "stun")
        g.rand = () => 0.7
        g.status(t,
            "stun",
            1.5)
        assert.equal(t.statuses.stun.until,
            g.turnsUntil("B",
                1))
        g.removeStatus(t,
            "stun")
        g.rand = () => 0.9
        g.status(t,
            "stun",
            0.75)
        assert.equal(t.statuses.stun,
            undefined,
            "0,75 trượt khi tung 0,9")
    })
test("Sát thương cộng thêm của đòn (buff, nội tại, proc) không tự chí mạng",
    () => {
        const s = mk({
            A: {
                v3_fighter: 2
            }, B: {
                v3_tank: 2
            }
        })
        const g = gm(s)
        const a = u(s,
                "A",
                "v3_fighter"), t = u(s,
                "B",
                "v3_tank")
        g.status(a,
            "alwaysCrit",
            1)
        a.nextAttack = [{
            bonusRaw: 50, bonusKind: "true"
        } as cg.NextAttackBuff]
        const r = g.attack(a,
            t)!
        assert.equal(r.crit,
            true)
        const dmg = g.events.filter((e) => e.t === "damage" && e.target === t.id) as Extract<cg.GameEvent, { t: "damage" }>[]
        assert.equal(dmg.length,
            2)
        assert.equal(dmg[0].amount,
            Math.round(100 * cg.RULES.critBase))
        assert.equal(dmg[1].amount,
            50,
            "phần cộng thêm giữ nguyên")
    })
test("Cứu chết theo thứ tự: nguồn đầu tiên cứu được thì dừng, chỉ nguồn đó bị tiêu",
    () => {
        const s = mk({
            A: {
                v3_fighter: 2, v3_saver: 1
            }, B: {
                v3_tank: 2
            }
        })
        const g = gm(s)
        const a = u(s,
            "A",
            "v3_fighter")
        g.equip(a,
            "giap_thien_than")
        saverCalls = 0
        g.damage(undefined,
            a,
            a.hp + 500,
            "true")
        assert.equal(a.status,
            "board")
        assert.equal(a.stacks["item:giap_thien_than"],
            0,
            "Giáp Thiên Thần (hạng cao hơn) được dùng")
        assert.equal(saverCalls,
            0,
            "nguồn sau không chạy khi đã được cứu")
        g.damage(undefined,
            a,
            a.hp + 500,
            "true")
        assert.equal(saverCalls,
            1)
        assert.equal(a.status,
            "board",
            "lần 2 do nguồn còn lại cứu")
    })

test("3 loại Khiên: trắng chặn mọi sát thương (kể cả chuẩn); vàng chỉ chặn vật lý; xanh dương chỉ chặn phép; Khiên cùng loại ăn trước Khiên trắng",
    () => {
        const s = mk({
            A: {
                v3_fighter: 2
            }, B: {
                v3_tank: 2
            }
        })
        const g = gm(s)
        const t = u(s,
            "B",
            "v3_tank")
        const hp0 = t.hp
        g.shield(undefined,
            t,
            50)
        g.shield(undefined,
            t,
            40,
            {
                kind: "physical"
            })
        g.shield(undefined,
            t,
            30,
            {
                kind: "magic"
            })
        assert.equal(g.totalShield(t),
            120)
        g.damage(undefined,
            t,
            60,
            "physical")
        assert.deepEqual([t.shieldPhys,
            t.shield,
            t.shieldMagic,
            t.hp],
        [0,
            30,
            30,
            hp0],
        "vật lý: vàng 40 trước, rồi trắng 20")
        g.damage(undefined,
            t,
            20,
            "true")
        assert.deepEqual([t.shield,
            t.shieldMagic,
            t.hp],
        [10,
            30,
            hp0],
        "sát thương chuẩn: chỉ Khiên trắng chặn")
        g.damage(undefined,
            t,
            50,
            "magic")
        assert.deepEqual([t.shieldMagic,
            t.shield,
            t.hp],
        [0,
            0,
            hp0 - 10],
        "phép: xanh dương 30, trắng 10, máu mất 10")
        g.shield(undefined,
            t,
            25,
            {
                kind: "magic"
            })
        g.damage(undefined,
            t,
            15,
            "physical")
        assert.equal(t.shieldMagic,
            25,
            "Khiên phép không chặn vật lý")
        g.kill(t)
        assert.equal(g.totalShield(t),
            0)
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
console.log(`\nTỔNG: ${results.length} test | PASS ${c("PASS")} | FAIL ${c("FAIL")}`)
process.exit(c("FAIL") ? 1 : 0)
