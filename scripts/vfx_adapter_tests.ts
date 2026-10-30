import assert from "node:assert/strict"
import {
    cg
} from "@starci/shared"
import {
    applyToDisplay, cardActions, finishPresentation, getCard, setDisplayLag, startPresentation, subscribePresentations, type PresentationBatch
} from "../packages/client/src/card/store"
import {
    LocalExampleGame, presentationEvents
} from "../packages/client/src/card/vfx/examples/localGame"
import {
    chooseExampleAction
} from "../packages/client/src/card/vfx/examples/scenarios"

Object.assign(globalThis,
    {
        window: {
            setTimeout, clearTimeout
        }
    })
const batches: PresentationBatch[] = []
const settle = () => {
    while (batches.length) {
        const batch = batches.shift()!
        startPresentation(batch)
        finishPresentation(batch)
    }
}
const game = new LocalExampleGame("chain-four",
    710)
game.prepare()
game.setPaused(true)
game.start()
const ownView = game.view()
assert.equal(ownView.players.B.deckSummary,
    undefined,
    "opponent deck composition is hidden")
assert.equal(ownView.players.A.deckSummary?.reduce((n, group) => n + group.count,
    0),
game.state.players.A.deck.length)
assert.ok(ownView.players.A.deckSummary?.every((group) => group.card.uid.startsWith("summary:")),
    "summary cards do not leak actual deck identifiers or order")
const reversed = structuredClone(game.state)
reversed.players.A.deck.reverse()
assert.deepEqual(game.view(reversed).players.A.deckSummary,
    ownView.players.A.deckSummary,
    "summary does not expose shuffled draw order")
setDisplayLag(true)
const unsubscribe = subscribePresentations((batch) => batches.push(batch))
game.playRecommended()
assert.equal(game.history.length,
    2)
assert.equal(getCard().presenting,
    true)
assert.equal(getCard().legal.length,
    0)
game.playRecommended()
assert.equal(game.history.length,
    2,
    "double click cannot consume another action during presentation")
settle()
game.setBothSides(true)
for (let i = 0; i < 3; i++) {
    game.playRecommended()
    assert.equal(getCard().presenting,
        true)
    settle()
}
assert.deepEqual(getCard().log.filter((x) => x.e.t === "chainResolve").map((x) => x.e.t === "chainResolve" ? x.e.n : 0),
    [4,
        3,
        2,
        1])
assert.equal(game.state.units["B:blitzcrank"].shield,
    82)
game.fork(0)
assert.equal(game.history.length,
    1)
assert.equal(game.state.units["B:blitzcrank"].shield,
    0)
assert.equal(getCard().log.length,
    0,
    "fork clears prior presentation/log history")
assert.equal(game.paused,
    true)
game.stop()

const full = new LocalExampleGame("full-match",
    710)
full.prepare()
full.setPaused(true)
full.start()
settle()
full.setBothSides(true)
let actions = 0
while (full.state.phase !== "over" && actions < 2000) {
    cardActions.act(chooseExampleAction(full.state,
        cg.whoseMove(full.state)))
    settle()
    actions++
}
assert.equal(full.state.phase,
    "over")
assert.equal(getCard().stage,
    "ended")
assert.equal(getCard().end?.winner,
    full.state.winner)
const last = full.history.length - 1
full.fork(last)
assert.equal(getCard().stage,
    "ended",
    "forking the final checkpoint preserves the real result")
full.fork(0)
assert.equal(getCard().stage,
    "playing")
assert.equal(getCard().end,
    null,
    "forking before game over removes the future result")
assert.equal(getCard().legal.length > 0,
    true)
full.stop()
unsubscribe()
setDisplayLag(false)
console.log(`Local adapter: double-click gating, chain4, actual ${actions}-action game, fork/result cleanup PASS`)

const secret: cg.Card = {
    uid: "private-draw", kind: "skill", id: "lux_r", hero: "lux", side: "B"
}
const privateDraw: cg.GameEvent = {
    t: "draw", side: "B", card: secret, reason: "turn"
}
const masked = presentationEvents([privateDraw],
    "A")[0]
assert.equal(masked.t === "draw" && "hidden" in masked.card,
    true)
assert.equal(masked.t === "draw" ? masked.card.id : undefined,
    undefined,
    "opponent drawn identity must not leak into the visible log")
assert.equal(privateDraw.card.id,
    "lux_r",
    "raw engine history remains complete and unmodified")
assert.equal((presentationEvents([privateDraw],
    "B")[0] as typeof privateDraw).card.id,
"lux_r")
console.log("Local presentation privacy: opponent draw hidden, owner card visible, raw history retained PASS")

for (const slug of ["blitz-steal",
    "blitz-steal-skill"]) {
    const theft = new LocalExampleGame(slug,
        710)
    theft.prepare()
    theft.setPaused(true)
    theft.start()
    setDisplayLag(true)
    let batch: PresentationBatch | undefined
    const stop = subscribePresentations((b) => { batch = b })
    theft.playRecommended()
    assert.ok(batch)
    startPresentation(batch)
    const stolen = batch.events.find((e) => e.t === "steal")
    assert.ok(stolen?.t === "steal")
    for (const event of batch.events) {
        applyToDisplay([event])
        const view = getCard().view!
        if (event.t === "steal") assert.equal(view.players.A.handCount,
            0,
            "steal notification does not grant a second card")
        assert.ok(view.players.A.handCount <= 1,
            "only the real receipt can add the gained card")
        if (slug === "blitz-steal-skill") assert.ok(!view.players.A.hand?.some((c) => c.uid === stolen.card.uid),
            "converted enemy skill never enters the player's hand")
    }
    assert.equal(getCard().view!.players.B.handCount,
        5)
    assert.equal(getCard().view!.players.A.handCount,
        1)
    finishPresentation(batch)
    stop()
    theft.stop()
}
console.log("Blitz theft presentation: one receipt, no duplicated card or transient enemy skill in hand PASS")
