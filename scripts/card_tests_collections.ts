import assert from "node:assert/strict"
import {
    cg
} from "@starci/shared"
import {
    getInspection, inspectionActions
} from "../packages/client/src/card/ui/inspection"

const cards: cg.Card[] = [
    {
        uid: "secret-position-1", kind: "support", id: "basic"
    },
    {
        uid: "secret-position-2", kind: "skill", id: "lux_q", hero: "lux", side: "A"
    },
    {
        uid: "secret-position-3", kind: "support", id: "basic"
    },
    {
        uid: "secret-position-4", kind: "skill", id: "lux_q", hero: "lux", side: "B"
    },
    {
        uid: "secret-position-5", kind: "support", id: "spell_heal", data: {
            value: 1, mode: "heal"
        }
    }
]
const original = structuredClone(cards)
const summary = cg.deckSummaryFor(cards,
    "A",
    "A")!
assert.equal(summary.reduce((sum, row) => sum + row.count,
    0),
cards.length)
assert.equal(summary.find((row) => row.card.id === "basic")?.count,
    2)
assert.equal(summary.filter((row) => row.card.id === "lux_q").length,
    2,
    "stolen skill origin is preserved")
assert.deepEqual(summary,
    cg.deckSummaryFor([...cards].reverse(),
        "A",
        "A"),
    "summary cannot reveal deck order")
assert.deepEqual(cards,
    original,
    "aggregation never mutates authoritative cards")
assert.ok(summary.every((row) => !cards.some((card) => card.uid === row.card.uid)))
assert.equal(JSON.stringify(summary).includes("secret-position"),
    false,
    "original uids stay private")
assert.equal(cg.deckSummaryFor(cards,
    "A",
    "B"),
undefined,
"opponent receives no composition")
assert.equal(cg.deckSummaryFor(cards,
    "A",
    null),
undefined,
"spectator receives no owner-only composition")
inspectionActions.unit("A:lux")
assert.equal(getInspection()?.kind,
    "unit")
inspectionActions.card(cards[1],
    {
        source: "hand"
    })
assert.equal(getInspection()?.kind,
    "card")
const shown = getInspection()
inspectionActions.card({
    ...cards[1], hidden: true
} as cg.Card,
{
    source: "chain"
})
assert.equal(getInspection(),
    shown,
    "hidden cards never replace the public inspector")
inspectionActions.clear()
assert.equal(getInspection(),
    null)
console.log("Collections: owner privacy, counts, no order/uid leak and UI inspection PASS")
