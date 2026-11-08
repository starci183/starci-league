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
// Mel reflects Leona's hit; Leona stuns Blitz before link 2 resolves, so it cannot steal.
assert.equal(game.state.units["B:blitzcrank"].stacks.blitz_parts ?? 0,
    0)
assert.equal(game.state.units["B:blitzcrank"].shield,
    0)
game.fork(0)
assert.equal(game.history.length,
    1)
assert.equal(game.state.units["B:blitzcrank"].stacks.blitz_parts ?? 0,
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

// Resignation is a room message, not an engine Action. Local binding must still finish the game.
const queued: (() => void)[] = []
const oldTimer = window.setTimeout, oldClear = window.clearTimeout
Object.assign(window,
    {
        setTimeout: (callback: () => void) => { queued.push(callback); return queued.length }, clearTimeout: () => {}
    })
try {
    const resigned = new LocalExampleGame("chain-four",
        710)
    resigned.prepare()
    setDisplayLag(false)
    resigned.start()
    resigned.setAuto(true)
    assert.ok(queued.length > 0,
        "a bot callback is already queued")
    cardActions.resign()
    assert.equal(resigned.state.phase,
        "over")
    assert.equal(resigned.state.winner,
        "B")
    assert.equal(getCard().stage,
        "ended")
    assert.deepEqual(getCard().end,
        {
            winner: "B", reason: "resign"
        })
    assert.deepEqual(getCard().legal,
        [])
    assert.equal(resigned.auto,
        false)
    assert.equal(resigned.paused,
        true)
    const endedAt = resigned.history.length
    queued.forEach(callback => callback())
    cardActions.resign()
    assert.equal(resigned.history.length,
        endedAt,
        "queued bot callback and repeated resign cannot act after the result")
    resigned.fork(endedAt - 1)
    assert.deepEqual(getCard().end,
        {
            winner: "B", reason: "resign"
        },
        "resignation checkpoint keeps its reason")
    resigned.fork(0)
    assert.equal(getCard().stage,
        "playing")
    assert.equal(getCard().end,
        null)
    resigned.stop()
} finally { Object.assign(window,
    {
        setTimeout: oldTimer, clearTimeout: oldClear
    }) }

const interrupted = new LocalExampleGame("chain-four",
    710)
interrupted.prepare()
interrupted.setPaused(true)
setDisplayLag(false)
interrupted.start()
setDisplayLag(true)
let stale: PresentationBatch | undefined
const stopInterrupted = subscribePresentations(batch => { stale = batch })
interrupted.playRecommended()
assert.ok(stale)
startPresentation(stale)
assert.equal(getCard().presenting,
    true)
cardActions.resign()
assert.equal(getCard().presenting,
    false)
assert.equal(interrupted.state.chain,
    null)
finishPresentation(stale)
assert.equal(getCard().stage,
    "ended",
    "a stale animation completion cannot reopen the game")
assert.deepEqual(getCard().end,
    {
        winner: "B", reason: "resign"
    })
assert.deepEqual(getCard().legal,
    [])
stopInterrupted()
interrupted.stop()
setDisplayLag(false)
console.log("Local resignation: actual result, queued bot/presentation cancellation, idempotence and fork cleanup PASS")
