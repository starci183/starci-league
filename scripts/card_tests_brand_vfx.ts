import assert from "node:assert/strict"
import {
    cg
} from "@starci/shared"

const state = cg.newGame(710,
    ["brand"],
    ["garen",
        "leona",
        "lux"])
state.phase = "main"
state.active = "A"
state.round = 8
state.ownTurns = {
    A: 1, B: 1
}
delete state.blind
const setup = new cg.Game(state)
setup.summon("A",
    "brand",
    2)
setup.summon("B",
    "garen",
    1)
setup.summon("B",
    "leona",
    2)
setup.summon("B",
    "lux",
    3)
state.players.A.hand = []
state.players.B.hand = []
setup.giveSkillToHand("A",
    "brand",
    "E",
    "test")
setup.giveSkillToHand("A",
    "brand",
    "R",
    "test")

function cast(input: cg.GameState, id: string) {
    const card = input.players.A.hand.find(c => c.id === id)!
    const action = cg.legalActions(input,
        "A").find(a => a.t === "play" && a.uid === card.uid)
    assert.ok(action)
    let out = cg.applyAction(input,
        action)
    const events = [...out.events]
    for (let i = 0; i < 8 && out.state.phase === "chain"; i++) {
        out = cg.applyAction(out.state,
            {
                t: "pass", side: cg.whoseMove(out.state)
            })
        events.push(...out.events)
    }
    return {
        state: out.state, events
    }
}

const e = cast(state,
    "brand_e")
const eDamage = e.events.filter((event): event is Extract<cg.GameEvent, { t: "damage" }> => event.t === "damage")
const stacksOn = (events: cg.GameEvent[]) => events.filter((event): event is Extract<cg.GameEvent, { t: "stack" }> => event.t === "stack" && event.key === "burn")
assert.equal(eDamage.length,
    3)
assert.equal(stacksOn(e.events).length,
    3,
    "Bỏng là bộ đếm (stack), mỗi địch +1")
assert.ok(!e.events.some((event) => event.t === "status" && event.id === "burn"),
    "Bỏng không còn là trạng thái có hạn")
assert.ok(eDamage.every(event => event.tag === "skill"))
assert.ok(!e.events.some(event => event.t === "damage" && event.tag === "dot"),
    "E applies Burn, never ticks it immediately")
const impactGroup = eDamage[0].visualGroup
assert.ok(impactGroup)
assert.ok(eDamage.every(event => event.visualGroup === impactGroup),
    "all three targets land in the same simultaneous impact group")
for (const id of ["B:garen",
    "B:leona",
    "B:lux"]) assert.equal(e.state.units[id].stacks.burn,
    1)

// A real enemy turn produces three grouped periodic receipts, after the E action ended.
const standby = cg.applyAction(e.state,
    {
        t: "end", side: "A"
    })
assert.equal(standby.state.active,
    "B")
const dots = standby.events.filter((event): event is Extract<cg.GameEvent, { t: "damage" }> => event.t === "damage" && event.src === "A:brand" && event.tag === "dot")
assert.equal(dots.length,
    3)
const tickGroup = dots[0].visualGroup
assert.ok(tickGroup)
assert.notEqual(tickGroup,
    impactGroup)
assert.ok(dots.every(event => event.visualGroup === tickGroup && event.visuals?.[0] === "burn"))
assert.deepEqual(dots.map(event => event.target).sort(),
    ["B:garen",
        "B:leona",
        "B:lux"])

// R: damage + Burn, doubles the stack and ticks it at once (separate from the periodic tick)
e.state.teamMana.A = 200
const r = cast(e.state,
    "brand_r")
const forcedTicks = r.events.filter(event => event.t === "damage" && event.tag === "dot")
assert.equal(forcedTicks.length,
    3)
assert.ok(forcedTicks.every(event => event.t === "damage" && event.visuals?.[0] === "burn"))
for (const id of ["B:garen",
    "B:leona",
    "B:lux"]) assert.equal(r.state.units[id].stacks.burn,
    4,
    "(1 cũ + 1 mới) × 2")
console.log("Brand VFX PASS: three simultaneous E impacts, silent Burn stacks, grouped enemy Standby burn, R doubles and ticks at once")
