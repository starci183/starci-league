import assert from "node:assert/strict"
import {
    cg
} from "@starci/shared"
import {
    cardActions, getCard, setDisplayLag, targetable
} from "../packages/client/src/card/store"
import {
    LocalExampleGame
} from "../packages/client/src/card/vfx/examples/localGame"
import {
    createScenario
} from "../packages/client/src/card/vfx/examples/scenarios"

Object.assign(globalThis,
    {
        window: {
            setTimeout, clearTimeout
        }
    })
const game = new LocalExampleGame("azir-kit",
    710)
game.prepare()
game.setPaused(true)
setDisplayLag(false)
game.start()
const card = getCard().view!.players.A.hand!.find((c) => c.id === "basic")!
const options = getCard().legal.filter((a) => a.t === "play" && a.uid === card.uid)
assert.ok(options.length)
const only = options[0] as Extract<cg.Action, { t: "play" }>
const n = game.history.length
cardActions.beginAttack(card.uid,
    [only])
assert.equal(game.history.length,
    n,
    "even one legal attack must wait for a player choice")
assert.deepEqual([...targetable(getCard().targeting).units],
    [only.args!.actor])
cardActions.chooseUnit(only.args!.target!)
assert.equal(getCard().targeting!.step,
    "actor",
    "enemy cannot be picked before the attacker")
cardActions.chooseUnit(only.args!.actor!)
assert.equal(game.history.length,
    n,
    "choosing the attacker must not auto-fire at the only enemy")
assert.equal(getCard().targeting!.step,
    "target")
assert.deepEqual([...targetable(getCard().targeting).units],
    [only.args!.target])
cardActions.cancelTargeting()
assert.equal(game.history.length,
    n,
    "cancel never spends the card")
cardActions.beginAttack(card.uid,
    [only])
cardActions.chooseUnit(only.args!.actor!)
cardActions.chooseUnit(only.args!.target!)
assert.equal(game.history.length,
    n + 1,
    "the explicit enemy click submits exactly one action")
game.stop()

const jayce = createScenario("jayce-summon").state
const modes = cg.legalActions(jayce,
    "A").filter((a) => a.t === "summon" && a.hero === "jayce").map((a) => a.t === "summon" ? a.mode : "")
assert.ok(modes.includes("hammer") && modes.includes("cannon"))
const sylas = createScenario("sylas-kit").state
const r = sylas.players.A.hand.find((c) => c.id === "sylas_r")!
assert.ok(cg.legalActions(sylas,
    "A").some((a) => a.t === "play" && a.uid === r.uid && a.args?.pick?.startsWith("steal:")),
"Sylas preview has real steal choices")
assert.ok(cg.legalActions(sylas,
    "A").filter((a) => a.t === "play" && a.uid === r.uid).every((a) => a.t === "play" && a.args?.pick?.endsWith(":R")),
"Sylas may steal only R, never Q or E")
const viktor = createScenario("viktor-kit").state
const q = viktor.players.A.hand.find((c) => c.id === "viktor_q")!
const discards = cg.legalActions(viktor,
    "A").filter((a) => a.t === "play" && a.uid === q.uid)
assert.ok(discards.some((a) => a.t === "play" && a.args?.discard?.length === 0),
    "discard zero is valid")
assert.ok(discards.some((a) => a.t === "play" && (a.args?.discard?.length ?? 0) > 1),
    "multi-select has legal combinations")
console.log("PASS attack actor → target, single-choice confirmation, invalid click, cancel, one submit, Jayce forms, Sylas options and Viktor discard choices")
