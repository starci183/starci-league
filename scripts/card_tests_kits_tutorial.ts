// Test màn Hướng dẫn của client Cocos: 6 tướng x 5 ô, mỗi thế cờ dựng được, lá cần thử dùng được (ngay, hoặc khi đòn địch định sẵn
// mở chuỗi), và chơi lá đó qua phòng chạy trong máy (net/localRoom.ts) ra đúng sự kiện. Dùng bản shared đã đồng bộ sang cocos
// (chạy `node scripts/sync-cocos.mjs` trước). Chạy: npx tsx scripts/card_tests_kits_tutorial.ts [--verbose]
import assert from "node:assert/strict"
import {
    cg
} from "../cocos/assets/scripts/shared"
import {
    LocalRoom
} from "../cocos/assets/scripts/net/localRoom"
import {
    SLOT_KEYS, TUTORIAL_HEROES, allScenarios, buildScenarioState, parseVariant, scenarioOf, variantsOf, type Scenario
} from "../cocos/assets/scripts/tutorial/scenarios"

// bộ chạy test bất đồng bộ nhỏ (in cùng định dạng với kit_test_util để card_tests.ts gộp tổng)
const queue: { group: string; name: string; fn: () => void | Promise<void> }[] = []
let group = ""
const G = (name: string) => { group = name }
const test = (name: string, fn: () => void | Promise<void>) => { queue.push({
    group, name, fn
}) }
async function report() {
    const NL = String.fromCharCode(10)
    let last = "", pass = 0, fail = 0
    for (const t of queue) {
        if (t.group !== last) { console.log(`${NL}== ${t.group} ==`); last = t.group }
        try { await t.fn(); pass++; console.log(`PASS  ${t.name}`) } catch (e) {
            fail++
            console.log(`FAIL  ${t.name}${NL}        -> ${(e as Error).message.split(NL).slice(0,
                3).join(" | ")}`)
        }
    }
    console.log(`${NL}TỔNG: ${queue.length} test | PASS ${pass} | FAIL ${fail}`)
    process.exit(fail ? 1 : 0)
}

type Msg = { type: string; payload: unknown }

/** Chạy phòng trong máy với nhịp 0 ms, gom mọi message; `drive` nhận các message và trả hành động kế (undefined = dừng) */
async function run(sc: Scenario, drive: (legal: cg.Action[], view: { phase: string; toMove: string }, hand: cg.Card[]) => cg.Action | undefined | "wait") {
    const room = new LocalRoom({
        state: buildScenarioState(sc), enemyPlan: sc.enemyPlan, pace: 0
    })
    const msgs: Msg[] = []
    let legal: cg.Action[] = []
    let view: { phase: string; toMove: string } = {
        phase: "", toMove: ""
    }
    for (const type of ["cg:state",
        "cg:legal",
        "cg:events",
        "cg:error",
        "cg:end"]) room.onMessage(type,
        ((p: unknown) => {
            msgs.push({
                type, payload: p
            })
            if (type === "cg:legal") legal = p as cg.Action[]
            if (type === "cg:state") { view = p as typeof view; legal = [] }
        }) as never)
    const tick = () => new Promise((r) => setTimeout(r,
        5))
    room.send("cg:sync")
    for (let i = 0; i < 40; i++) {
        await tick()
        await tick()
        const a = drive(legal,
            view,
            handOf(msgs))
        if (a === undefined) break
        if (a === "wait") continue
        legal = []
        room.send("cg:action",
            {
                action: a
            })
    }
    room.dispose()
    return msgs
}

const handOf = (msgs: Msg[]) => {
    const st = [...msgs].reverse().find((m) => m.type === "cg:state")?.payload as { players: { A: { hand: cg.Card[] } } } | undefined
    return st?.players.A.hand ?? []
}

for (const hero of TUTORIAL_HEROES) {
    G(`Hướng dẫn · ${hero}`)
    for (const slot of SLOT_KEYS) {
        const list = variantsOf(hero,
            slot)
        test(`${hero}:${slot} có kịch bản`,
            () => { assert.ok(list.length > 0,
                "thiếu kịch bản") })
        for (const sc of list) {
            const tag = `${hero}:${slot}${list.length > 1 ? `:${sc.variant + 1} (${sc.title})` : ""}`
            test(`${tag} dựng được, lá cần thử dùng được và ra sự kiện`,
                async () => {
                    if (list.length > 1) assert.ok(sc.title,
                        "biến thể thiếu tên")
                    const s = buildScenarioState(sc)
                    assert.ok(s.units[`A:${hero}`]?.status === "board",
                        "tướng chưa ra sân")
                    for (const id of sc.focus) assert.ok(s.players.A.hand.some((c) => c.id === id),
                        `thiếu lá ${id} trên tay`)
                    const enemyFirst = s.active === "B"
                    let played = false
                    const msgs = await run(sc,
                        (legal, view, hand) => {
                            if (played) {
                                // xong: chỉ cần bỏ qua chuỗi cho tới khi hết
                                const pass = legal.find((a) => a.t === "pass")
                                return pass ?? undefined
                            }
                            if (!legal.length) return "wait"
                            if (sc.act === "attack") {
                                const atk = legal.find((a) => a.t === "attack" && a.actor === `A:${hero}` && a.cardless)
                                if (!atk) throw new Error(`không có đòn không cần lá; hợp lệ: ${legal.map((a) => a.t).join(",")}`)
                                played = true
                                return atk
                            }
                            if (sc.act === "end") {
                                const end = legal.find((a) => a.t === "end")
                                if (!end) return legal.find((a) => a.t === "pass") ?? "wait"
                                played = true
                                return end
                            }
                            const want = sc.focus.length ? sc.focus : null
                            if (!want) {
                                // kịch bản chỉ xem (đòn địch định sẵn): bỏ qua khi được hỏi phản ứng
                                const pass = legal.find((a) => a.t === "pass")
                                if (!pass) return played ? undefined : "wait"
                                played = true
                                return pass
                            }
                            const pick = legal.find((a) => (a.t === "play" || a.t === "chain") && want.includes(hand.find((c) => c.uid === a.uid)?.id ?? "")
                                && (!sc.target || a.args?.target === sc.target || a.args?.targets?.includes(sc.target) === true))
                            if (!pick) {
                                // chưa tới lúc (chuỗi của địch chưa mở): bỏ qua nếu đang trong chuỗi khác
                                if (view.phase === "chain") return legal.find((a) => a.t === "pass")
                                throw new Error(`không có hành động dùng ${want.join(",")}; hợp lệ: ${legal.map((a) => a.t).join(",")}`)
                            }
                            played = true
                            return pick
                        })
                    const errors = msgs.filter((m) => m.type === "cg:error")
                    assert.equal(errors.length,
                        0,
                        JSON.stringify(errors))
                    if (sc.focus.length || sc.act) assert.ok(played,
                        "chưa dùng được lá / chưa làm được việc cần làm")
                    const events = msgs.filter((m) => m.type === "cg:events").flatMap((m) => m.payload as cg.GameEvent[])
                    if (sc.focus.some((id) => id.startsWith(hero))) assert.ok(events.some((e) => e.t === "cast" && e.unit === `A:${hero}`),
                        "không thấy sự kiện cast của tướng")
                    if (sc.act === "attack") assert.ok(events.some((e) => e.t === "attack" && e.attacker === `A:${hero}`),
                        "không thấy đòn đánh của tướng")
                    // đòn địch định sẵn mở thế cờ (phe B đi trước) thì phải xảy ra
                    if (sc.enemyPlan && enemyFirst) assert.ok(events.some((e) => (e.t === "play" || e.t === "attack") && ((e as { side?: string }).side === "B" || String((e as { attacker?: string }).attacker ?? "").startsWith("B:"))),
                        "đòn địch định sẵn không xảy ra")
                    if (process.argv.includes("--verbose")) console.log(tag,
                        events.map((e) => e.t).join(" "))
                })
        }
    }
}
G("Hướng dẫn · biến thể")
test("Garen, Darius, Aatrox: mỗi ô có ít nhất 2 biến thể; Yorick 2+ trừ đánh thường; Braum, Blitzcrank giữ 1 kịch bản mỗi ô",
    () => {
        for (const hero of TUTORIAL_HEROES) for (const slot of SLOT_KEYS) {
            const n = variantsOf(hero,
                slot).length
            if (["garen",
                "darius",
                "aatrox"].includes(hero)) assert.ok(n >= 2,
                `${hero}:${slot} chỉ có ${n}`)
            else if (hero === "yorick") assert.ok(n >= (slot === "basic" ? 1 : 2),
                `${hero}:${slot} chỉ có ${n}`)
            else assert.equal(n,
                1,
                `${hero}:${slot}`)
        }
    })
test("scenarioOf mặc định biến thể đầu, parseVariant đếm từ 1, allScenarios đủ mọi biến thể",
    () => {
        assert.equal(scenarioOf("garen",
            "e")?.variant,
        0)
        assert.equal(scenarioOf("garen",
            "e",
            1)?.title,
        variantsOf("garen",
            "e")[1].title)
        assert.equal(scenarioOf("garen",
            "e",
            9),
        undefined)
        assert.equal(parseVariant("2"),
            1)
        assert.equal(parseVariant(undefined),
            0)
        assert.equal(parseVariant("x"),
            0)
        assert.equal(parseVariant("0"),
            0)
        assert.equal(allScenarios().length,
            TUTORIAL_HEROES.reduce((n, h) => n + SLOT_KEYS.reduce((m, k) => m + variantsOf(h,
                k).length,
            0),
            0))
        assert.equal(scenarioOf("braum",
            "q")?.title,
        "")
    })

// một vài kiểm tra cơ chế đặc trưng
G("Hướng dẫn · cơ chế")
test("Darius R hạ Lux có 4 Chảy Máu: lá R về tay",
    async () => {
        const sc = scenarioOf("darius",
            "r")!
        let done = false
        const msgs = await run(sc,
            (legal) => {
                if (done) return legal.find((a) => a.t === "pass")
                const r = legal.find((a) => a.t === "play" && a.args?.target === "B:lux")
                if (!r) return legal.length ? undefined : "wait"
                done = true
                return r
            })
        const events = msgs.filter((m) => m.type === "cg:events").flatMap((m) => m.payload as cg.GameEvent[])
        assert.ok(events.some((e) => e.t === "kill" && e.target === "B:lux"),
            "Lux chưa bị hạ")
        assert.ok(handOf(msgs).some((c) => c.id === "darius_r"),
            "lá R chưa về tay")
    })
test("Yorick nội tại: 24 Hồn, đòn trúng đủ 25 Hồn thì nhận lá R",
    async () => {
        const sc = scenarioOf("yorick",
            "p",
            1)!
        let done = false
        const msgs = await run(sc,
            (legal) => {
                if (done) return legal.find((a) => a.t === "pass")
                const atk = legal.find((a) => a.t === "attack")
                if (!atk) return legal.length ? undefined : "wait"
                done = true
                return atk
            })
        assert.ok(handOf(msgs).some((c) => c.id === "yorick_r"),
            "chưa nhận lá R")
    })
/** Chơi đúng lá + mục tiêu của kịch bản rồi bỏ qua chuỗi; trả các sự kiện */
async function playScenario(hero: string, slot: "p" | "q" | "e" | "r" | "basic", variant = 0) {
    const sc = scenarioOf(hero,
        slot,
        variant)!
    let done = false
    const msgs = await run(sc,
        (legal, _v, hand) => {
            if (done) return legal.find((a) => a.t === "pass")
            const a = legal.find((x) => (x.t === "play" || x.t === "chain") && sc.focus.includes(hand.find((c) => c.uid === x.uid)?.id ?? "")
                && (!sc.target || x.args?.target === sc.target))
            if (!a) return legal.length && !legal.some((x) => x.t === "pass") ? undefined : legal.find((x) => x.t === "pass") ?? "wait"
            done = true
            return a
        })
    return {
        msgs, events: msgs.filter((m) => m.type === "cg:events").flatMap((m) => m.payload as cg.GameEvent[])
    }
}
test("Garen R hạ Lux Máu thấp",
    async () => {
        const { events } = await playScenario("garen",
            "r")
        assert.ok(events.some((e) => e.t === "kill" && e.target === "B:lux"))
    })
test("Darius E kéo Lux về đối diện",
    async () => {
        const { events } = await playScenario("darius",
            "e")
        assert.ok(events.some((e) => e.t === "move" && (e as { unit?: string }).unit === "B:lux"))
    })
test("Blitzcrank Q cướp lá chiêu của Darius: kéo Darius sang đối diện",
    async () => {
        const { events } = await playScenario("blitzcrank",
            "q")
        assert.ok(events.some((e) => e.t === "steal"))
        assert.ok(events.some((e) => e.t === "move" && (e as { unit?: string }).unit === "B:darius"),
            events.map((e) => e.t).join(" "))
    })
test("Blitzcrank E giật lá Darius Q giữa chuỗi, Darius bị Choáng",
    async () => {
        const { events } = await playScenario("blitzcrank",
            "e")
        assert.ok(events.some((e) => e.t === "chainCancel"))
        assert.ok(events.some((e) => e.t === "status" && (e as { id?: string }).id === "stun"),
            "không Choáng")
    })
test("Braum E đỡ thay Garen",
    async () => {
        const { events } = await playScenario("braum",
            "e")
        assert.ok(events.some((e) => e.t === "shield" && e.target === "A:braum"))
    })
test("Yorick R 30 Hồn kết liễu Ahri",
    async () => {
        const { events } = await playScenario("yorick",
            "r",
            1)
        assert.ok(events.some((e) => e.t === "kill" && e.target === "B:ahri"))
    })
test("Yorick cạn bài: E đốt 2 lá cuối, hết lượt thì đối thủ thua",
    async () => {
        const sc = scenarioOf("yorick",
            "p",
            2)!
        assert.equal(buildScenarioState(sc).players.B.deck.length,
            2)
        let played = false, ended = false
        const msgs = await run(sc,
            (legal, _v, hand) => {
                if (!played) {
                    const a = legal.find((x) => x.t === "play" && hand.find((c) => c.uid === x.uid)?.id === "yorick_e")
                    if (!a) return legal.length ? undefined : "wait"
                    played = true
                    return a
                }
                const pass = legal.find((x) => x.t === "pass")
                if (pass) return pass
                if (!ended) {
                    const e = legal.find((x) => x.t === "end")
                    if (e) { ended = true; return e }
                }
                return legal.length ? undefined : "wait"
            })
        const end = msgs.find((m) => m.type === "cg:end")?.payload as { winner?: string; reason?: string } | undefined
        assert.equal(end?.winner,
            "A")
        assert.equal(end?.reason,
            "deck")
    })
test("Braum nội tại: Darius đánh Braum, Braum nhận Song Giáp",
    async () => {
        const sc = scenarioOf("braum",
            "p")!
        const msgs = await run(sc,
            (legal) => legal.find((a) => a.t === "pass") ?? (legal.length ? undefined : "wait"))
        const st = [...msgs].reverse().find((m) => m.type === "cg:state")?.payload as { units: Record<string, cg.Unit> }
        assert.ok((st.units["A:braum"].stacks.braum_dual ?? 0) > 2,
            "Song Giáp không tăng")
    })

// ---- biến thể của Garen, Darius, Aatrox: chạy thẳng engine cho kết quả chắc chắn ----
G("Hướng dẫn · biến thể Garen, Darius, Aatrox")
type Res = { state: cg.GameState; events: cg.GameEvent[] }
/** Phe `side` dùng lá `id` (play hoặc chain), khớp mục tiêu nếu có */
function cast(s: cg.GameState, side: cg.Side, id: string, target?: string): Res {
    const legal = cg.legalActions(s,
        side)
    const a = legal.find((x) => (x.t === "play" || x.t === "chain") && s.players[side].hand.find((c) => c.uid === x.uid)?.id === id
        && (!target || x.args?.target === target))
    assert.ok(a,
        `${side} không dùng được ${id}; hợp lệ: ${legal.map((x) => x.t).join(",")}`)
    return cg.applyAction(s,
        a!)
}
/** Bỏ qua chuỗi cho tới khi giải quyết xong, gom sự kiện */
function settle(r: Res): Res {
    let s = r.state
    const events = [...r.events]
    for (let i = 0; i < 30 && s.phase === "chain" && s.chain; i++) {
        const x = cg.applyAction(s,
            {
                t: "pass", side: s.chain.priority
            })
        s = x.state
        events.push(...x.events)
    }
    return {
        state: s, events
    }
}
/** Nối thêm một bước sau `r`, gộp sự kiện */
const then = (r: Res, f: (s: cg.GameState) => Res): Res => {
    const x = f(r.state)
    return {
        state: x.state, events: [...r.events,
            ...x.events]
    }
}
const endTurn = (s: cg.GameState, side: cg.Side): Res => {
    const a = cg.legalActions(s,
        side).find((x) => x.t === "end")
    assert.ok(a,
        `${side} chưa kết thúc lượt được`)
    return settle(cg.applyAction(s,
        a!))
}
const stateOf = (hero: string, slot: "p" | "q" | "e" | "r" | "basic", variant: number) => buildScenarioState(scenarioOf(hero,
    slot,
    variant)!)
type DamageEv = Extract<cg.GameEvent, { t: "damage" }>
const dmgOn = (ev: cg.GameEvent[], target: string, src?: string) => ev.filter((e): e is DamageEv => e.t === "damage" && e.target === target && (!src || e.src === src))
const sum = (xs: { amount: number }[]) => xs.reduce((n, x) => n + x.amount,
    0)

test("Aatrox R: không có R thì Tàn Sát của Darius hạ Aatrox; có R thì về 0 Máu rồi hồi sinh 30%",
    () => {
        const base = stateOf("aatrox",
            "r",
            0)
        const noR = then(endTurn(structuredClone(base),
            "A"),
        (s) => settle(cast(s,
            "B",
            "darius_q")))
        assert.ok(noR.events.some((e) => e.t === "kill" && e.target === "A:aatrox"),
            "đòn của Darius chưa đủ hạ Aatrox")
        const r = then(then(settle(cast(base,
            "A",
            "aatrox_r")),
        (s) => endTurn(s,
            "A")),
        (s) => settle(cast(s,
            "B",
            "darius_q")))
        const hits = dmgOn(r.events,
            "A:aatrox",
            "B:darius")
        assert.ok(hits.some((e) => e.hp <= 0),
            `đòn Darius phải đưa Aatrox về 0: ${JSON.stringify(hits)}`)
        assert.ok(!r.events.some((e) => e.t === "kill" && e.target === "A:aatrox"),
            "Aatrox bị hạ")
        const me = r.state.units["A:aatrox"]
        assert.equal(me.status,
            "board")
        assert.ok(me.hp >= Math.floor(me.maxHp * 0.3) - 1,
            `hồi sinh chưa đủ 30%: ${me.hp}/${me.maxHp}`)
    })
test("Aatrox R chủ động rồi Q: hoá quỷ, Q chém mạnh hơn khi chưa hoá quỷ",
    () => {
        const base = stateOf("aatrox",
            "r",
            1)
        const plain = settle(cast(structuredClone(base),
            "A",
            "aatrox_q"))
        const demon = then(settle(cast(base,
            "A",
            "aatrox_r")),
        (s) => settle(cast(s,
            "A",
            "aatrox_q")))
        assert.ok(demon.events.some((e) => e.t === "transform"),
            "chưa hoá quỷ")
        assert.ok(sum(dmgOn(demon.events,
            "B:ahri")) > sum(dmgOn(plain.events,
            "B:ahri")),
        "Q ở dạng quỷ không mạnh hơn")
    })
test("Aatrox Q: Máu thấp chém mạnh hơn Đầy Máu",
    () => {
        const full = settle(cast(stateOf("aatrox",
            "q",
            0),
        "A",
        "aatrox_q"))
        const low = settle(cast(stateOf("aatrox",
            "q",
            1),
        "A",
        "aatrox_q"))
        assert.ok(sum(dmgOn(low.events,
            "B:ahri")) > sum(dmgOn(full.events,
            "B:ahri")) * 1.15)
    })
test("Aatrox E (Quick) nối chuỗi Darius Q: Aatrox nhận Khiên",
    () => {
        const r = settle(then(cast(stateOf("aatrox",
            "e",
            0),
        "B",
        "darius_q"),
        (s) => cast(s,
            "A",
            "aatrox_e")))
        assert.ok(r.events.some((e) => e.t === "shield" && e.target === "A:aatrox" && e.amount > 0),
            "không có Khiên")
        assert.ok(dmgOn(r.events,
            "B:darius",
            "A:aatrox").length > 0,
        "E chưa chém Darius")
    })
test("Garen R: cùng đường gấp đôi khác đường; cùng đường hạ Lux, khác đường Annie sống",
    () => {
        const other = settle(cast(stateOf("garen",
            "r",
            1),
        "A",
        "garen_r",
        "B:annie"))
        // cùng thế cờ, chỉ đưa Garen sang đường của Annie
        const sc = scenarioOf("garen",
            "r",
            1)!
        const same0 = cg.newGame(7,
            sc.teamA,
            sc.teamB)
        cg.applyStage(same0,
            {
                ...sc.stage, board: {
                    ...sc.stage.board, garen: 3
                }
            })
        const same = settle(cast(same0,
            "A",
            "garen_r",
            "B:annie"))
        const d1 = sum(dmgOn(other.events,
                "B:annie")), d2 = sum(dmgOn(same.events,
                "B:annie"))
        assert.ok(d1 > 0)
        assert.ok(Math.abs(d2 - 2 * d1) <= 1,
            `cùng đường ${d2}, khác đường ${d1}`)
        assert.ok(!other.events.some((e) => e.t === "kill"),
            "khác đường không được hạ")
        const kill = settle(cast(stateOf("garen",
            "r",
            0),
        "A",
        "garen_r",
        "B:lux"))
        assert.ok(kill.events.some((e) => e.t === "kill" && e.target === "B:lux"),
            "cùng đường chưa hạ Lux")
    })
test("Garen Q Câm Lặng Darius: sang lượt đối thủ Darius không dùng được Tàn Sát (không Q thì dùng được)",
    () => {
        const canQ = (s: cg.GameState) => cg.legalActions(s,
            "B").some((a) => a.t === "play" && s.players.B.hand.find((c) => c.uid === a.uid)?.id === "darius_q")
        const base = stateOf("garen",
            "q",
            1)
        const ctrl = endTurn(structuredClone(base),
            "A")
        assert.equal(ctrl.state.active,
            "B")
        assert.ok(canQ(ctrl.state),
            "không Câm Lặng mà Darius vẫn không dùng được Q")
        const q = settle(cast(base,
            "A",
            "garen_q"))
        assert.ok(q.events.some((e) => e.t === "status" && e.target === "B:darius" && e.id === "silence"),
            "chưa Câm Lặng Darius")
        const after = endTurn(q.state,
            "A")
        assert.equal(after.state.active,
            "B")
        assert.ok(!canQ(after.state),
            "Darius bị Câm Lặng vẫn dùng được Q")
    })
test("Garen E chủ động: chém đối diện và 2 đường kề, đường xa không trúng, hồi Máu",
    () => {
        const r = settle(cast(stateOf("garen",
            "e",
            1),
        "A",
        "garen_e"))
        const ahri = sum(dmgOn(r.events,
                "B:ahri")), lux = sum(dmgOn(r.events,
                "B:lux"))
        assert.ok(ahri > 0 && lux > 0 && sum(dmgOn(r.events,
            "B:annie")) > 0)
        assert.equal(dmgOn(r.events,
            "B:ashe").length,
        0)
        assert.ok(lux < ahri)
        assert.ok(r.events.some((e) => e.t === "heal" && e.target === "A:garen"),
            "Garen không hồi Máu")
    })
test("Garen nội tại: tay đôi chưa đồ (Máu +9%, Q +12%) so với đủ 3 món và địch đủ 5 đường",
    () => {
        const duel = stateOf("garen",
                "p",
                0), full = stateOf("garen",
                "p",
                1)
        assert.equal(duel.units["A:garen"].items.length,
            0)
        assert.equal(full.units["A:garen"].items.length,
            3)
        assert.equal(Object.values(full.units).filter((u) => u.side === "B" && u.status === "board" && !u.token).length,
            5)
        // Kiên Cường: 3% + 2% x 3 ô trống = 9%
        assert.ok(duel.units["A:garen"].maxHp >= Math.round(450 * 1.09) - 1,
            `Máu tối đa tay đôi ${duel.units["A:garen"].maxHp}`)
    })
test("Darius R hạ được: lá về tay và chém tiếp được Annie; không hạ: lá nằm trong 5 lá trên cùng bộ",
    () => {
        const kill = settle(cast(stateOf("darius",
            "r",
            0),
        "A",
        "darius_r",
        "B:lux"))
        assert.ok(kill.events.some((e) => e.t === "kill" && e.target === "B:lux"))
        assert.ok(kill.state.players.A.hand.some((c) => c.id === "darius_r"),
            "lá R chưa về tay")
        const again = settle(cast(kill.state,
            "A",
            "darius_r",
            "B:annie"))
        assert.ok(dmgOn(again.events,
            "B:annie",
            "A:darius").length > 0,
        "chưa chém tiếp Annie")
        const s = stateOf("darius",
            "r",
            1)
        const uid = s.players.A.hand.find((c) => c.id === "darius_r")!.uid
        const miss = settle(cast(s,
            "A",
            "darius_r",
            "B:annie"))
        assert.ok(!miss.events.some((e) => e.t === "kill"),
            "không được hạ")
        assert.ok(miss.events.some((e) => e.t === "move" && e.unit === "A:darius"),
            "Darius chưa sang đối diện")
        assert.ok(!miss.state.players.A.hand.some((c) => c.uid === uid),
            "lá R không được về tay")
        const at = miss.state.players.A.deck.findIndex((c) => c.uid === uid)
        assert.ok(at >= 0 && at < 5,
            `lá R ở vị trí ${at} của bộ`)
    })
test("Darius E kéo Lux và Giữ Chân; Blitzcrank Q cướp trúng chiêu Lux nhưng không kéo được nó",
    () => {
        const e = settle(cast(stateOf("darius",
            "e",
            1),
        "A",
        "darius_e",
        "B:lux"))
        assert.equal(e.state.units["B:lux"].lane,
            2)
        assert.ok(e.events.some((x) => x.t === "status" && x.target === "B:lux" && x.id === "root"),
            "Lux chưa bị Giữ Chân")
        const q = settle(cast(e.state,
            "A",
            "blitzcrank_q",
            "B:lux"))
        assert.ok(q.events.some((x) => x.t === "steal"),
            "chưa cướp lá")
        assert.ok(!q.events.some((x) => x.t === "move" && x.unit === "B:lux"),
            "Lux bị Giữ Chân mà vẫn bị kéo")
        assert.equal(q.state.units["B:lux"].lane,
            2)
        // đối chứng: không có Giữ Chân thì Q kéo được Lux sang đối diện Blitzcrank
        const ctrl = settle(cast(stateOf("darius",
            "e",
            1),
        "A",
        "blitzcrank_q",
        "B:lux"))
        assert.ok(ctrl.events.some((x) => x.t === "move" && x.unit === "B:lux"),
            "đối chứng: Q phải kéo được Lux")
    })
test("Darius nội tại: kết thúc lượt, đầu lượt đối thủ Chảy Máu gây sát thương theo số tầng",
    () => {
        const r = endTurn(stateOf("darius",
            "p",
            1),
        "A")
        const tick = (t: string) => sum(r.events.filter((e): e is DamageEv => e.t === "damage" && e.target === t && e.tag === "dot"))
        assert.ok(tick("B:lux") > 0,
            "Lux chưa rỉ máu")
        assert.ok(tick("B:ahri") > tick("B:lux") * 2,
            `Ahri ${tick("B:ahri")} / Lux ${tick("B:lux")}`)
    })
test("Darius Q hai lần: lần 2 mạnh hơn lần 1 nhờ Chảy Máu",
    () => {
        const one = settle(cast(stateOf("darius",
            "q",
            1),
        "A",
        "darius_q"))
        const two = settle(cast(one.state,
            "A",
            "darius_q"))
        assert.ok(sum(dmgOn(two.events,
            "B:ahri")) > sum(dmgOn(one.events,
            "B:ahri")))
    })

void report()
