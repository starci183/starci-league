import assert from "node:assert/strict"
import {
    cg
} from "@starci/shared"
import {
    ignite, burnTick
} from "../packages/shared/src/cardgame/heroes/brand"
import {
    effectVfxNames
} from "../packages/client/src/card/vfx/semanticVfx"
import {
    presentationEvents
} from "../packages/client/src/card/vfx/examples/localGame"
import {
    VFX_CATALOG
} from "../packages/client/src/card/vfx/catalog"

const state = cg.newGame(710,
    ["brand",
        "darius",
        "teemo"],
    ["garen",
        "lux"])
state.phase = "main"
state.active = "A"
state.round = 8
delete state.blind
const g = new cg.Game(state)
g.summon("A",
    "brand",
    2)
g.summon("A",
    "darius",
    1)
g.summon("B",
    "garen",
    2)
const brand = state.units["A:brand"], darius = state.units["A:darius"], target = state.units["B:garen"]

// A source-selected recipe is 1 -> N, copied into the event and persistent status.
const recipe = ["fireHit",
    "burn"]
g.status(target,
    "burn",
    2,
    {
        v: 2, visuals: recipe
    })
const initialStatus = g.events.at(-1)!
assert.equal(initialStatus.t,
    "status")
assert.deepEqual("visuals" in initialStatus && initialStatus.visuals,
    recipe)
recipe.push("stunHit")
assert.deepEqual(target.statuses.burn.visuals,
    ["fireHit",
        "burn"])
assert.deepEqual("visuals" in initialStatus && initialStatus.visuals,
    ["fireHit",
        "burn"])
g.status(target,
    "burn",
    3,
    {
        v: 3
    })
assert.deepEqual(target.statuses.burn.visuals,
    ["fireHit",
        "burn"],
    "refresh preserves source appearance")

// Same gameplay status/tag, different presentation chosen at the source.
g.status(target,
    "burn",
    3,
    {
        v: 1, visuals: [], tickVisuals: ["poisonHit"]
    })
burnTick(g,
    brand,
    target)
const poisonTick = g.events.at(-1)!
assert.equal(poisonTick.t,
    "damage")
assert.deepEqual(poisonTick.t === "damage" && poisonTick.visuals,
    ["poisonHit"])
assert.deepEqual(poisonTick.t === "damage" && effectVfxNames(poisonTick,
    "brand"),
["poisonHit"],
"metadata beats hero inference")
ignite(g,
    target,
    1)
assert.deepEqual(target.statuses.burn.visuals,
    [],
    "Brand application is silent")
assert.deepEqual(target.statuses.burn.tickVisuals,
    ["burn"],
    "tick keeps its separate recipe")
burnTick(g,
    brand,
    target)
assert.deepEqual(g.events.at(-1)?.t === "damage" && (g.events.at(-1) as Extract<cg.GameEvent, { t: "damage" }>).visuals,
    ["burn"])
g.status(target,
    "bleed",
    2,
    {
        v: 1, visuals: ["bleedTick"]
    })
g.hook("onTurnStart",
    {
        side: "B"
    })
assert.ok(g.events.some(e => e.t === "damage" && e.src === darius.id && e.tag === "dot" && e.visuals?.[0] === "bleedTick"))

// Explicit suppression is different from an absent recipe, without suppressing gameplay.
const hp = target.hp
g.damage(brand,
    target,
    5,
    "true",
    {
        tag: "dot", visuals: []
    })
const suppressed = g.events.at(-1)!
assert.equal(target.hp,
    hp - 5)
assert.equal(suppressed.t,
    "damage")
assert.deepEqual(suppressed.t === "damage" && effectVfxNames(suppressed,
    "brand"),
[])
g.damage(brand,
    target,
    5,
    "true",
    {
        tag: "dot"
    })
const unknown = {
    ...(g.events.at(-1) as Extract<cg.GameEvent, { t: "damage" }>), src: undefined
}
assert.deepEqual(effectVfxNames(unknown),
    [],
    "unknown DoT must not invent poison")
g.heal(brand,
    target,
    5,
    {
        visuals: ["heal",
            "holyLight"]
    })
const healed = g.events.at(-1)!
assert.equal(healed.t,
    "heal")
assert.deepEqual(healed.t === "heal" && effectVfxNames(healed),
    ["heal",
        "holyLight"])
g.shield(brand,
    target,
    5,
    {
        visuals: ["shield",
            "runicBarrier"]
    })
const shielded = g.events.at(-1)!
assert.equal(shielded.t,
    "shield")
assert.deepEqual(shielded.t === "shield" && effectVfxNames(shielded),
    ["shield",
        "runicBarrier"])

// Packet projection preserves the public appearance recipe while hiding private cards.
const draw: cg.GameEvent = {
    t: "draw", side: "B", card: g.skillCard("lux",
        "B",
        "Q"), reason: "effect"
}
const projected = presentationEvents([healed,
    shielded,
    poisonTick,
    draw],
"A")
assert.deepEqual(projected.slice(0,
    3),
[healed,
    shielded,
    poisonTick])
assert.equal(projected[3].t,
    "draw")
assert.equal(projected[3].t === "draw" && projected[3].card.id,
    undefined)
const ids = new Set(VFX_CATALOG.map(v => v.id))
for (const event of g.events) if ("visuals" in event && event.visuals) for (const name of event.visuals) assert.ok(ids.has(name),
    `Unregistered source-selected VFX: ${name}`)
console.log("VFX metadata PASS: source-selected 1→N, burn/poison variants, bleed ticks, status persistence, [] suppression, public privacy, registered names")
