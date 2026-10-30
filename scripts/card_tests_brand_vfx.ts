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
const marks = e.events.filter((event): event is Extract<cg.GameEvent, { t: "status" }> => event.t === "status" && event.id === "burn")
assert.equal(eDamage.length,
    3)
assert.equal(marks.length,
    3)
assert.ok(eDamage.every(event => event.tag === "skill"))
assert.ok(!e.events.some(event => event.t === "damage" && event.tag === "dot"),
    "E applies marks, never ticks them immediately")
const impactGroup = eDamage[0].visualGroup
assert.ok(impactGroup)
assert.ok([...eDamage,
    ...marks].every(event => event.visualGroup === impactGroup),
"all three targets land in the same simultaneous impact group")
assert.ok(marks.every(event => event.visuals?.length === 0 && event.tickVisuals?.[0] === "burn"),
    "mark application has no flame VFX")
for (const mark of marks) {
    assert.equal(e.state.units[mark.target].statuses.burn.v,
        1)
    assert.deepEqual(e.state.units[mark.target].statuses.burn.visuals,
        [])
    assert.deepEqual(e.state.units[mark.target].statuses.burn.tickVisuals,
        ["burn"])
}

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
    marks.map(event => event.target).sort())

// R's existing forced burn is a different gameplay rule and must remain intact.
const r = cast(e.state,
    "brand_r")
const forcedTicks = r.events.filter(event => event.t === "damage" && event.tag === "dot")
assert.equal(forcedTicks.length,
    3)
assert.ok(forcedTicks.every(event => event.t === "damage" && event.visuals?.[0] === "burn"))
assert.ok(r.events.filter(event => event.t === "status" && event.id === "burn").every(event => event.t === "status" && event.visuals?.length === 0))
console.log("Brand VFX PASS: three simultaneous E impacts, silent permanent marks, grouped enemy Standby burn, existing R forced ticks preserved")
