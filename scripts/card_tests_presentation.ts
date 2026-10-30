import assert from "node:assert/strict"
import {
    cg
} from "@starci/shared"
import {
    buildPlan, type Fx
} from "../packages/client/src/card/anim/plan"
import {
    effectStylesFor
} from "../packages/client/src/card/vfx/dispatch"
import {
    effectSequence
} from "../packages/client/src/card/vfx/semanticVfx"
import {
    effectBatches, movementTracks, runActionVfxSequence, runConcurrentTargets, runVisualSequence
} from "../packages/client/src/card/vfx/sequence"
import {
    PresentationInbox
} from "../packages/client/src/card/anim/eventQueue"
import {
    applyToDisplay, finishPresentation, getCard, prepareCardArrival, receiveCardEvents, receiveCardLegal, receiveCardState, setDisplayLag, startPresentation, subscribePresentations, type CardView, type PresentationBatch
} from "../packages/client/src/card/store"

Object.assign(globalThis,
    {
        window: {
            clearTimeout
        }
    })

const inbox = new PresentationInbox<number>()
const delivered: number[] = []
inbox.push(1)
inbox.push(2)
const unsub = inbox.subscribe((n) => { delivered.push(n); if (n === 2) inbox.push(3) })
inbox.push(4)
unsub()
inbox.push(5)
inbox.subscribe((n) => delivered.push(n))
assert.deepEqual(delivered,
    [1,
        2,
        3,
        4,
        5],
    "bursts and remounts retain FIFO delivery")

const initial = {
    ...cg.newGame(42,
        ["darius"],
        ["garen"]), you: "A", toMove: "A", names: {
        A: "A", B: "B"
    }, rules: cg.RULES
} as unknown as CardView
receiveCardState(initial)
setDisplayLag(true)
const batches: PresentationBatch[] = []
const stop = subscribePresentations((b) => batches.push(b))
const victim = initial.units["B:garen"]
assert.ok(victim)
const next = (hp: number, turnNo: number): CardView => ({
    ...initial, turnNo, units: {
        ...initial.units, [victim.id]: {
            ...victim, hp
        }
    }
})
const damage = (hp: number): cg.GameEvent => ({
    t: "damage", target: victim.id, amount: 10, hpLost: 10, absorbed: 0, hp, kind: "physical"
}) as cg.GameEvent
for (let i = 1; i <= 6; i++) {
    receiveCardEvents([damage(victim.hp - i * 10)])
    receiveCardState(next(victim.hp - i * 10,
        initial.turnNo + i))
    receiveCardLegal([{
        t: "end", side: "A"
    }])
}
assert.equal(batches.length,
    6,
    "six rapid updates survive without React renders")
assert.equal(getCard().view?.turnNo,
    initial.turnNo,
    "turn does not jump ahead")
assert.equal(getCard().view?.units[victim.id].hp,
    victim.hp,
    "HP waits for impact")
assert.equal(getCard().legal.length,
    0,
    "input remains gated during playback")
assert.equal(getCard().log.length,
    0,
    "results are not logged before playback")
for (const [i,
    batch] of batches.entries()) {
    startPresentation(batch)
    finishPresentation(batch)
    assert.equal(getCard().view?.units[victim.id].hp,
        victim.hp - (i + 1) * 10,
        "each action uses its own server snapshot")
    assert.equal(getCard().view?.turnNo,
        initial.turnNo + i + 1)
    assert.equal(getCard().log.length,
        i + 1)
}
assert.equal(getCard().presenting,
    false)
assert.equal(getCard().legal.length,
    1,
    "input returns after the final batch")
receiveCardEvents([damage(victim.hp - 70)])
receiveCardState(next(victim.hp - 70,
    initial.turnNo + 7))
const abandoned = batches[batches.length - 1]
startPresentation(abandoned)
setDisplayLag(false)
const settled = getCard().view
finishPresentation(abandoned)
assert.equal(getCard().view,
    settled,
    "unmounted playback cannot republish an old batch")
assert.equal(getCard().presenting,
    false,
    "unmount releases input gating")
stop()
// Draw receipts and deck counts must remain hidden while their card animation runs.
const opening = {
    ...initial, players: {
        ...initial.players, A: {
            ...initial.players.A, hand: [], handCount: 0, deckCount: 170
        }
    }
}
receiveCardState(opening)
setDisplayLag(true)
let drawBatch: PresentationBatch | undefined
const stopDraw = subscribePresentations((b) => { drawBatch = b })
const card: cg.Card = {
    uid: "draw-queue-regression", kind: "support", id: "basic"
}
receiveCardEvents([{
    t: "draw", side: "A", card, reason: "turn"
}])
receiveCardState({
    ...opening, players: {
        ...opening.players, A: {
            ...opening.players.A, hand: [card], handCount: 1, deckCount: 169
        }
    }
})
assert.equal(getCard().view?.players.A.hand?.length,
    0,
    "drawn card remains hidden until card animation completes")
assert.equal(getCard().view?.players.A.deckCount,
    170,
    "deck count does not announce draw early")
assert.ok(drawBatch)
startPresentation(drawBatch)
prepareCardArrival("A",
    card)
assert.equal(getCard().view?.players.A.handCount,
    0,
    "reserving a landing slot must not announce receipt")
applyToDisplay([drawBatch.events[0]])
assert.equal(getCard().view?.players.A.handCount,
    1,
    "touchdown updates this card before the whole batch finishes")
assert.equal(getCard().view?.players.A.deckCount,
    169)
finishPresentation(drawBatch)
assert.equal(getCard().view?.players.A.hand?.[0].uid,
    card.uid)
assert.equal(getCard().view?.players.A.deckCount,
    169)
stopDraw()
setDisplayLag(false)
receiveCardState(opening)
setDisplayLag(true)
let multiple: PresentationBatch | undefined
const stopMultiple = subscribePresentations((batch) => { multiple = batch })
const card2 = {
    ...card, uid: "second-arrival"
}
const reward = {
    ...card, uid: "reward-arrival", id: "gold"
}
const arrivals: cg.GameEvent[] = [{
    t: "draw", side: "A", card, reason: "effect"
},
{
    t: "draw", side: "A", card: card2, reason: "effect"
},
{
    t: "create", side: "A", card: reward, zone: "hand"
},
{
    t: "freeCard", side: "A", card: reward, kind: "gold"
}]
receiveCardEvents(arrivals)
receiveCardState({
    ...opening, players: {
        ...opening.players, A: {
            ...opening.players.A, hand: [card,
                card2,
                reward], handCount: 3, deckCount: 168
        }
    }
})
assert.ok(multiple)
startPresentation(multiple)
for (const [index,
    arriving] of [card,
        card2,
        reward].entries()) {
    prepareCardArrival("A",
        arriving)
    assert.equal(getCard().view?.players.A.hand?.length,
        index + 1,
        "only the next landing slot exists, never all future arrivals")
    assert.equal(getCard().view?.players.A.handCount,
        index)
    applyToDisplay([arrivals[index]])
    assert.equal(getCard().view?.players.A.handCount,
        index + 1,
        "cards become received one at a time")
}
applyToDisplay([arrivals[3]])
assert.equal(getCard().view?.players.A.handCount,
    3,
    "freeCard metadata must not duplicate a create receipt")
assert.equal(getCard().view?.players.A.deckCount,
    168,
    "generated rewards do not consume the deck")
finishPresentation(multiple)
stopMultiple()
setDisplayLag(false)
const firstDamage = damage(victim.hp - 10)
const secondDamage = damage(victim.hp - 20)
const chainEvents = [
    {
        t: "chainResolve", n: 2, side: "B", card
    },
    firstDamage,
    {
        t: "chainResolve", n: 1, side: "A", card
    },
    secondDamage,
    {
        t: "chainEnd", length: 2
    }
] as cg.GameEvent[]
const noDom: Fx = {
    spawn: async () => { throw new Error("plan construction must not need DOM") }, drop: () => {}, t: (ms) => ms
}
const chainPlan = buildPlan(chainEvents,
    noDom)
assert.equal(chainPlan.length,
    2,
    "response and original action need separate presentation steps")
assert.ok(chainPlan[0].end <= chainPlan[1].start)
assert.equal(chainEvents[chainPlan[0].start].t,
    "chainResolve")
assert.equal(chainEvents[chainPlan[1].start].t,
    "chainResolve")
const fourEvents = [4,
    3,
    2,
    1].flatMap((n) => [{
    t: "chainResolve", n, side: n % 2 ? "A" : "B", card
},
damage(victim.hp - n * 10)]) as cg.GameEvent[]
const fourPlan = buildPlan(fourEvents,
    noDom)
assert.equal(fourPlan.length,
    4,
    "four chain links have four separate visual steps")
assert.deepEqual(fourPlan.map((p) => (fourEvents[p.start] as Extract<cg.GameEvent, { t: "chainResolve" }>).n),
    [4,
        3,
        2,
        1])
console.log("Presentation: FIFO bursts, snapshots, logs, draw receipts, chain ordering, input gating and unmount PASS")

// A source may choose N cues for one receipt. Rendering must not replay damage.
const visualDamage = {
    ...damage(victim.hp - 10), visuals: ["fireHit",
        "burn",
        "stunHit"]
} as Extract<cg.GameEvent, { t: "damage" }>
const visualStyles = effectStylesFor(visualDamage,
    undefined,
    "brand")
assert.deepEqual(visualStyles.map(style => style.impact),
    ["fireHit",
        "burn",
        "stunHit"])
let landed = 0
const rendered: string[] = []
await runVisualSequence(visualStyles,
    async style => { assert.equal(landed,
        1); rendered.push(style.impact) },
    () => { landed++ })
assert.equal(landed,
    1,
    "three visual cues land the gameplay receipt exactly once")
assert.deepEqual(rendered,
    visualDamage.visuals)
const actionOrder: string[] = []
let actionLands = 0
await runActionVfxSequence(["one",
    "two",
    "three"],
async cue => { actionOrder.push(`travel:${cue}`) },
async cue => { actionOrder.push(`impact:${cue}`) },
() => { actionLands++ })
assert.deepEqual(actionOrder,
    ["travel:one",
        "impact:one",
        "travel:two",
        "impact:two",
        "travel:three",
        "impact:three"])
assert.equal(actionLands,
    1)
const suppressed = effectStylesFor({
    ...visualDamage, visuals: []
},
undefined,
"brand")
assert.deepEqual(suppressed,
    [])
await runVisualSequence(suppressed,
    async () => { throw new Error("suppressed cue rendered") },
    () => { landed++ })
assert.equal(landed,
    2,
    "an explicit empty list still lands the one real receipt")
let active = true, cancelledLands = 0
const cancelled: string[] = []
await runVisualSequence(visualStyles,
    async style => { cancelled.push(style.impact); active = false },
    () => { cancelledLands++ },
    () => active)
assert.deepEqual(cancelled,
    ["fireHit"])
assert.equal(cancelledLands,
    1)
await runVisualSequence(visualStyles,
    async () => { throw new Error("stale sequence rendered") },
    () => { cancelledLands++ },
    () => false)
assert.equal(cancelledLands,
    1,
    "stale generation cannot land or restart a cue")
const sameTarget: cg.GameEvent[] = [visualDamage,
    {
        t: "status", target: victim.id, id: "stun", turns: 1, v: 1
    },
    {
        t: "heal", target: victim.id, amount: 10, hp: victim.hp
    }]
assert.deepEqual(effectSequence(sameTarget).map(event => event.t),
    ["damage",
        "status",
        "heal"],
    "same-target effects retain independent ordered receipts")
assert.deepEqual(movementTracks({
    unit: "A:ahri", from: 1, to: 3, with: "A:darius"
}),
[
    {
        unit: "A:ahri", from: 1, to: 3, arc: -48
    },
    {
        unit: "A:darius", from: 3, to: 1, arc: 48
    }
],
"a swap animates both cards concurrently on opposite arcs")
console.log("Presentation: 1→N cues, single state landing, suppression, cancellation, multi-effect order and twin swap tracks PASS")

// Final wire snapshots may already contain later mana/stack values. Each receipt
// must advance the displayed value only as far as its own presentation beat.
setDisplayLag(false)
const resourceInitial: CardView = {
    ...initial, teamMana: {
        A: 80, B: 80
    }
}
receiveCardState(resourceInitial)
setDisplayLag(true)
let resourceBatch: PresentationBatch | undefined
const stopResource = subscribePresentations(batch => { resourceBatch = batch })
const resourceEvents: cg.GameEvent[] = [
    {
        t: "teamManaChange", side: "A", unit: "A:darius", delta: -20, mana: 60, max: 200, reason: "spend"
    },
    {
        t: "status", target: victim.id, id: "burn", turns: 1, v: 3
    },
    {
        t: "teamManaChange", side: "A", unit: "A:darius", delta: -15, mana: 45, max: 200, reason: "spend"
    },
    {
        t: "status", target: victim.id, id: "burn", turns: 1, v: 6
    }
]
receiveCardEvents(resourceEvents)
receiveCardState({
    ...resourceInitial, teamMana: {
        A: 45, B: 80
    }, units: {
        ...resourceInitial.units, [victim.id]: {
            ...victim, statuses: {
                ...victim.statuses, burn: {
                    until: 5, v: 6
                }
            }
        }
    }
})
assert.ok(resourceBatch)
startPresentation(resourceBatch)
assert.equal(getCard().view!.teamMana.A,
    80)
applyToDisplay([resourceBatch.events[0]])
assert.equal(getCard().view!.teamMana.A,
    60,
    "first mana beat cannot jump to final 45")
applyToDisplay([resourceBatch.events[0]])
assert.equal(getCard().view!.teamMana.A,
    60,
    "replaying a cue never spends the resource twice")
applyToDisplay([resourceBatch.events[1]])
assert.equal(getCard().view!.units[victim.id].statuses.burn.v,
    3,
    "first status beat cannot jump to final six stacks")
applyToDisplay(resourceBatch.events.slice(2))
assert.equal(getCard().view!.teamMana.A,
    45)
assert.equal(getCard().view!.teamMana.B,
    80)
assert.equal(getCard().view!.units[victim.id].statuses.burn.v,
    6)
finishPresentation(resourceBatch)
stopResource()
setDisplayLag(false)
const manaPlan = buildPlan([resourceEvents[0],
    {
        t: "play", side: "A", card
    },
    {
        t: "cast", unit: "A:darius", skill: "Q", target: victim.id
    },
    damage(victim.hp - 10)],
noDom)
assert.equal(manaPlan.length,
    2)
assert.equal(manaPlan[0].start,
    0)
assert.equal(manaPlan[0].end,
    1,
    "resource payment is a separate beat before the skill reveal/cast")
console.log("Presentation: shared Mana exact pay beats, no double consumption, independent teams and ordered status stacks PASS")

const simultaneous: cg.GameEvent[] = [
    {
        ...visualDamage, target: "B:garen", visualGroup: "brand:e:one", visuals: ["fireHit",
            "burn"]
    },
    {
        t: "status", target: "B:garen", id: "burn", turns: 1, v: 1, visualGroup: "brand:e:one", visuals: []
    },
    {
        ...visualDamage, target: "B:jinx", visualGroup: "brand:e:one", visuals: ["fireHit"]
    },
    {
        t: "status", target: "B:jinx", id: "burn", turns: 1, v: 1, visualGroup: "brand:e:one", visuals: []
    },
    {
        ...visualDamage, target: "B:annie", visualGroup: "brand:e:one", visuals: ["fireHit"]
    },
    resourceEvents[0],
    {
        ...visualDamage, target: "B:garen", visualGroup: "brand:e:one", visuals: ["burn"]
    }
]
const concurrentBatches = effectBatches(simultaneous)
assert.deepEqual(concurrentBatches.map(batch => batch.events.length),
    [5,
        1],
    "a resource payment splits otherwise equal group IDs")
const concurrentOrder: string[] = []
let groupLands = 0, releaseFirst = () => {}
const heldFirst = new Promise<void>(resolve => { releaseFirst = resolve })
const groupRun = runConcurrentTargets(concurrentBatches[0].events,
    event => event.target,
    async event => {
        const cues = effectStylesFor(event,
            undefined,
            "brand")
        await runVisualSequence(cues,
            async (style, index) => {
                concurrentOrder.push(`${event.target}:${style.impact}`)
                assert.equal(groupLands,
                    1,
                    "every target observes the same already-landed group result")
                if (event.target === "B:garen" && !index) await heldFirst
            },
            () => {})
    },
    () => { groupLands++ })
await Promise.resolve()
assert.deepEqual(concurrentOrder,
    ["B:garen:fireHit",
        "B:jinx:fireHit",
        "B:annie:fireHit"],
    "three target queues begin before the first target completes")
let groupCompleted = false
void groupRun.then(() => { groupCompleted = true })
await Promise.resolve()
assert.equal(groupCompleted,
    false,
    "next action waits for the slowest target cue")
releaseFirst()
await groupRun
assert.equal(groupLands,
    1)
assert.deepEqual(concurrentOrder,
    ["B:garen:fireHit",
        "B:jinx:fireHit",
        "B:annie:fireHit",
        "B:garen:burn"],
    "N cues retain target-local order; silent burn application adds no cue")
console.log("Presentation: simultaneous target groups, ordered N cues, silent state receipts and wait-all boundary PASS")
