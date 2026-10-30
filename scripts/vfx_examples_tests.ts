import {
    strict as assert
} from "node:assert"
import {
    cg
} from "@starci/shared"
import {
    buildPlan, type Fx
} from "../packages/client/src/card/anim/plan"
import {
    EXAMPLES, chooseExampleAction, createScenario, recommendedAction
} from "../packages/client/src/card/vfx/examples/scenarios"

const play = (slug: string) => {
    const scenario = createScenario(slug)
    const action = recommendedAction(scenario,
        scenario.state,
        "A")
    assert.ok(action,
        `${slug}: cần hành động gợi ý hợp lệ`)
    return {
        before: scenario.state, out: cg.applyAction(scenario.state,
            action)
    }
}
const summon = createScenario("summon-champions")
let summonState = summon.state
const summoned: cg.GameEvent[] = []
for (let i = 0; i < 20 && summonState.phase === "blind"; i++) {
    const result = cg.applyAction(summonState,
        chooseExampleAction(summonState,
            cg.whoseMove(summonState)))
    summonState = result.state
    summoned.push(...result.events.filter((e) => e.t === "summon"))
}
assert.equal(summonState.phase,
    "main")
assert.equal(summoned.length,
    2)
assert.equal(summon.opening.length,
    0,
    "summon checkpoint starts after the genuine initial deal")
const viktor = play("viktor-e-jinx")
assert.deepEqual(viktor.out.events.filter((e) => e.t === "damage").map((e) => e.t === "damage" ? e.target : "").sort(),
    ["B:jinx",
        "B:leona",
        "B:lux"].sort())
const pull = play("darius-e-pull")
assert.equal(pull.before.lanes.B[2],
    "B:garen")
assert.equal(pull.out.state.lanes.B[2],
    "B:jinx")
assert.equal(pull.out.state.lanes.B[1],
    "B:garen",
    "bàn đầy: Jinx và Garen hoán đổi ô")
assert.ok(pull.out.events.findIndex((e) => e.t === "move") < pull.out.events.findIndex((e) => e.t === "damage"))
const draw = play("draw-cards")
assert.equal(draw.out.events.filter((e) => e.t === "draw").length,
    2)
assert.equal(draw.out.state.players.A.deck.length,
    draw.before.players.A.deck.length - 2)
assert.equal(draw.out.state.players.A.hand.length,
    draw.before.players.A.hand.length + 1)

// Real Teemo receipts must preserve each explosion and the compensating draw.
const planted = play("teemo-mushrooms")
assert.equal(planted.out.events.filter(e => e.t === "create" && e.card.id === "mushroom").length,
    3)
assert.equal(planted.out.events.find(e => e.t === "mushroom")?.phase,
    "plant")
const teemoScenario = createScenario("teemo-mushrooms")
const detonate = recommendedAction(teemoScenario,
    planted.out.state,
    "A")
assert.ok(detonate)
const detonated = cg.applyAction(planted.out.state,
    detonate)
assert.equal(detonated.events.filter(e => e.t === "mushroom" && e.phase === "burst").length,
    3)
assert.ok(!detonated.state.players.B.deck.some(c => c.id === "mushroom"))
const trap = play("teemo-draw-mushroom")
assert.equal(trap.out.events.filter(e => e.t === "drawAuto").length,
    1)
assert.equal(trap.out.events.filter(e => e.t === "draw").length,
    2)
assert.ok(!trap.out.state.players.A.hand.some(c => c.id === "mushroom"))
assert.ok(trap.out.events.some(e => e.t === "mushroom" && e.drawn && e.target === "A:darius"))
const trapFx: Fx = {
    spawn: async () => { throw new Error("planning does not touch DOM") }, drop: () => {}, t: ms => ms
}
for (const events of [detonated.events,
    trap.out.events]) {
    const plan = buildPlan(events,
        trapFx)
    const bursts = plan.filter(p => events.slice(p.start,
        p.end).some(e => e.t === "mushroom" && e.phase === "burst"))
    assert.equal(bursts.length,
        events.filter(e => e.t === "mushroom" && e.phase === "burst").length)
    for (const p of bursts) assert.equal(events.slice(p.start,
        p.end).filter(e => e.t === "damage").length,
    1)
}
console.log("PASS Teemo: three separate detonations, public trap receipt and compensating draw")

for (const slug of ["blitz-steal",
    "blitz-steal-skill"]) {
    const theft = play(slug)
    const stolen = theft.out.events.find((e) => e.t === "steal")
    assert.ok(stolen?.t === "steal")
    assert.equal(stolen.from,
        "B")
    assert.equal(stolen.to,
        "A")
    assert.equal(theft.before.players.B.hand.length,
        6)
    assert.equal(theft.out.state.players.B.hand.length,
        5)
    assert.equal(theft.out.state.players.A.hand.length,
        1)
    assert.ok(theft.out.state.units["A:blitzcrank"].shield > 0)
    if (slug === "blitz-steal") {
        assert.equal(theft.out.state.players.A.hand[0].uid,
            stolen.card.uid)
        assert.equal(theft.out.events.some((e) => e.t === "damage"),
            false)
    } else {
        assert.equal(theft.out.state.players.A.hand[0].hero,
            "blitzcrank")
        assert.notEqual(theft.out.state.players.A.hand[0].uid,
            stolen.card.uid)
        assert.ok(theft.out.state.players.B.grave.some((c) => c.uid === stolen.card.uid))
        assert.ok(theft.out.events.some((e) => e.t === "damage" && e.target === "B:jinx"))
    }
}

for (const slug of ["chain-shield",
    "chain-counter"]) {
    const initial = play(slug)
    assert.equal(initial.out.state.phase,
        "chain")
    const reaction = cg.legalActions(initial.out.state,
        "B").find((a) => a.t === "chain")
    assert.ok(reaction)
    const result = cg.applyAction(initial.out.state,
        reaction)
    assert.deepEqual(result.events.filter((e) => e.t === "chainResolve").map((e) => e.t === "chainResolve" ? e.n : 0),
        [2,
            1])
    if (slug === "chain-shield") assert.ok(result.events.findIndex((e) => e.t === "shield") < result.events.findIndex((e) => e.t === "damage"))
    else assert.ok(result.events.some((e) => e.t === "damage" && e.src === "B:jinx" && e.target === "A:ashe" && e.kind === "true"))
}

const armor = play("armor-and-mr")
const four = createScenario("chain-four")
let chain4 = four.state
let fourEvents: cg.GameEvent[] = []
for (let i = 0; i < 4; i++) {
    const side = cg.whoseMove(chain4)
    assert.equal(side,
        i % 2 === 0 ? "A" : "B")
    const action = recommendedAction(four,
        chain4,
        side)
    assert.ok(action,
        `mắt xích ${i + 1} phải hợp lệ bằng chiêu thật`)
    const result = cg.applyAction(chain4,
        action)
    chain4 = result.state
    fourEvents = result.events
}
assert.deepEqual(fourEvents.filter((e) => e.t === "chainResolve").map((e) => e.t === "chainResolve" ? e.n : 0),
    [4,
        3,
        2,
        1])
assert.deepEqual(fourEvents.filter((e) => e.t === "chainCancel").map((e) => e.t === "chainCancel" ? e.n : 0),
    [3,
        1])
assert.equal(fourEvents.filter((e) => e.t === "damage").length,
    0,
    "chiêu bị giật không gây sát thương giả")
assert.equal(fourEvents.filter((e) => e.t === "shield").length,
    2,
    "nội tại Blitz trả Khiên cho hai lần giật")
const armorBefore = new cg.Game(armor.before)
const armorAfter = new cg.Game(armor.out.state)
assert.equal(armorAfter.armor(armor.out.state.units["A:leona"]) - armorBefore.armor(armor.before.units["A:leona"]),
    60)
assert.equal(armorAfter.mr(armor.out.state.units["A:leona"]) - armorBefore.mr(armor.before.units["A:leona"]),
    60)
assert.equal(armor.out.events.some((e) => e.t === "shield"),
    false)
const lux = play("spell-shield-mana")
assert.equal(lux.before.teamMana.A,
    cg.RULES.teamManaStart - 30)
assert.ok(lux.out.state.teamMana.A > lux.before.teamMana.A)
assert.equal(lux.out.state.teamMana.B,
    lux.before.teamMana.B)
assert.ok(lux.out.events.some((e) => e.t === "shield"))
assert.equal(lux.out.events.some((e) => e.t === "damage"),
    false)
const manaScenario = createScenario("mana-spend")
assert.deepEqual(manaScenario.state.teamMana,
    {
        A: 80, B: 80
    })
const brandSpend = recommendedAction(manaScenario,
    manaScenario.state,
    "A")
assert.ok(brandSpend?.t === "play")
assert.equal(manaScenario.state.players.A.hand.find(c => c.uid === brandSpend.uid)?.id,
    "brand_e")
// giá mana chiêu do chat cân bằng chỉnh: đọc giá thật
const spendOf = (events: cg.GameEvent[]) => events.filter(e => e.t === "teamManaChange" && e.reason === "spend").reduce((n, e) => n + (e.t === "teamManaChange" ? -e.delta : 0),
    0)
const afterBrand = cg.applyAction(manaScenario.state,
    brandSpend)
const brandCost = spendOf(afterBrand.events)
assert.ok(brandCost > 0)
assert.equal(afterBrand.state.teamMana.A,
    80 - brandCost)
const luxSpend = recommendedAction(manaScenario,
    afterBrand.state,
    "A")
assert.ok(luxSpend?.t === "play")
assert.equal(afterBrand.state.players.A.hand.find(c => c.uid === luxSpend.uid)?.id,
    "lux_e")
const afterLux = cg.applyAction(afterBrand.state,
    luxSpend)
const luxCost = spendOf(afterLux.events)
assert.ok(luxCost > 0)
assert.deepEqual(afterLux.state.teamMana,
    {
        A: 80 - brandCost - luxCost, B: 80
    },
    "Lux tiêu tiếp từ bể Brand đã dùng; đối thủ giữ 80")
assert.ok(!Object.values(afterLux.state.units).some(u => u.mana !== undefined),
    "new games do not recreate individual mana meters")
console.log(`PASS Shared mana fixture: Brand E 80→${80 - brandCost}, allied Lux E →${80 - brandCost - luxCost}, opponent remains 80`)
console.log(`PASS ${EXAMPLES.length - 1} playable checkpoints: summon, Blitz theft/conversion, targets, pull, draw, chain2→1, reflection, armor/MR, Lux mana/shield`)

let state = createScenario("full-match",
    710).state
const counts: Record<string, number> = {
}
let actions = 0
while (state.phase !== "over" && actions < 2000 && state.round < 80) {
    const side = cg.whoseMove(state)
    const action = chooseExampleAction(state,
        side)
    assert.ok(cg.legalActions(state,
        side).some((a) => JSON.stringify(a) === JSON.stringify(action)))
    const out = cg.applyAction(state,
        action)
    for (const e of out.events) counts[e.t] = (counts[e.t] ?? 0) + 1
    state = out.state
    actions++
}
assert.equal(state.phase,
    "over",
    "full game must reach a genuine engine result")
console.log("COVERAGE",
    JSON.stringify({
        actions, round: state.round, counts
    }))
for (const key of ["summon",
    "draw",
    "freeCard",
    "cast",
    "attack",
    "chainResolve",
    "craft",
    "equip",
    "status",
    "kill",
    "respawn",
    "end"]) assert.ok(counts[key] > 0,
    `full match needs ${key}`)
console.log("FULL_MATCH",
    JSON.stringify({
        seed: 710, actions, round: state.round, winner: state.winner, reason: state.endReason, lives: {
            A: state.players.A.lives, B: state.players.B.lives
        }, counts
    }))

// Renata R forces real basic attacks; each needs its own flight/impact/HP step.
const forced = cg.newGame(710,
    ["renata"],
    ["darius",
        "garen"])
forced.phase = "main"
forced.round = 8
forced.turnNo = 15
forced.active = "A"
delete forced.blind
const forceGame = new cg.Game(forced)
forceGame.summon("A",
    "renata",
    2)
forceGame.summon("B",
    "darius",
    2)
forceGame.summon("B",
    "garen",
    1)
forceGame.tutor("A",
    (card) => card.id === "renata_r")
// Renata R: each enemy makes ONE attack action at a random teammate; hits = floor(AS/100) (+ fractional chance).
// Darius gets +100 attack speed (200 -> exactly 2 hits); Garen stays at base 100 (exactly 1 hit).
const forcedDarius = forceGame.heroes("B").find((unit) => unit.hero === "darius")!
const forcedGaren = forceGame.heroes("B").find((unit) => unit.hero === "garen")!
forceGame.status(forcedDarius,
    "attack_speed",
    1,
    {
        v: 100
    })
assert.equal(forceGame.attackSpeed(forcedDarius),
    200)
assert.equal(forceGame.attackSpeed(forcedGaren),
    100)
const forceAction = cg.legalActions(forced,
    "A").find((action) => action.t === "play" && forced.players.A.hand.find((card) => card.uid === action.uid)?.id === "renata_r")
assert.ok(forceAction)
const forcedEvents = cg.applyAction(forced,
    forceAction).events
const actualAttacks = forcedEvents.filter((event) => event.t === "attack")
assert.equal(actualAttacks.filter((event) => event.t === "attack" && event.attacker === forcedDarius.id && event.target === forcedGaren.id).length,
    2,
    "Renata R: Darius (200 attack speed) makes one attack action of 2 hits at Garen")
assert.equal(actualAttacks.filter((event) => event.t === "attack" && event.attacker === forcedGaren.id && event.target === forcedDarius.id).length,
    1,
    "Renata R: Garen (100 attack speed) makes one attack action of 1 hit at Darius")
assert.equal(actualAttacks.length,
    3,
    "Renata R: one attack action per enemy hero, hit count by attack speed")
const noDom: Fx = {
    spawn: async () => { throw new Error("planning must not need DOM") }, drop: () => {}, t: (ms) => ms
}
const forcedPlan = buildPlan(forcedEvents,
    noDom)
const attackSteps = forcedPlan.filter((step) => forcedEvents.slice(step.start,
    step.end).some((event) => event.t === "attack"))
assert.equal(attackSteps.length,
    actualAttacks.length,
    "each forced attack has a separate presentation step")
for (const step of attackSteps) assert.equal(forcedEvents.slice(step.start,
    step.end).filter((event) => event.t === "attack").length,
1)
console.log("PASS Renata R: one attack action per enemy (hits by attack speed), each hit keeps its own presentation step")

// Every baseline role remains one actual attack even if its VFX recipe grows.
for (const role of ["assassin",
    "fighter",
    "mage",
    "support",
    "marksman",
    "tank"]) {
    const result = play(`basic-${role}`)
    assert.equal(result.out.events.filter(event => event.t === "attack").length,
        1)
    assert.equal(result.out.events.filter(event => event.t === "damage" && event.tag === "attack").length,
        1)
}
const brand = play("brand-effects")
assert.deepEqual(brand.out.events.filter(event => event.t === "damage" || event.t === "status").map(event => event.t === "status" ? event.id : event.t),
    ["damage",
        "burn",
        "stun"])
const swap = play("swap-allies")
const movement = swap.out.events.find(event => event.t === "move")
assert.ok(movement?.t === "move" && movement.with)
assert.equal(swap.out.state.units[movement.unit].lane,
    movement.to)
assert.equal(swap.out.state.units[movement.with].lane,
    movement.from)
console.log("PASS All six role attacks, Brand's damage→burn→stun and real two-card swap")
