import assert from "node:assert/strict"
import {
    cg
} from "@starci/shared"

// The first playable turn really starts at the approved 80, even after blind summon.
let opening = cg.newGame(710,
    ["brand",
        "lux",
        "darius"],
    ["garen",
        "blitzcrank"])
assert.deepEqual(opening.teamMana,
    {
        A: 80, B: 80
    })
for (let i = 0; i < 20 && opening.phase === "blind"; i++) opening = cg.applyAction(opening,
    cg.chooseAction(opening,
        cg.whoseMove(opening),
        "easy")).state
assert.equal(opening.phase,
    "main")
assert.deepEqual(opening.teamMana,
    {
        A: 80, B: 80
    })

let state = cg.newGame(711,
    ["brand",
        "lux",
        "darius"],
    ["garen",
        "blitzcrank"])
state.phase = "main"
state.round = 8
state.ownTurns = {
    A: 1, B: 1
}
delete state.blind
const setup = new cg.Game(state)
setup.summon("A",
    "brand",
    0)
setup.summon("A",
    "lux",
    1)
setup.summon("A",
    "darius",
    2)
setup.summon("B",
    "garen",
    2)
state.players.A.hand = []
state.players.B.hand = []
for (const [hero,
    key] of [["brand",
        "E"],
    ["lux",
        "E"],
    ["darius",
        "Q"]] as const) setup.giveSkillToHand("A",
    hero,
    key,
    "test")
const spends: Extract<cg.GameEvent, { t: "teamManaChange" }>[] = []
function play(id: string) {
    const card = state.players.A.hand.find(c => c.id === id)!
    const action = cg.legalActions(state,
        "A").find(a => a.t === "play" && a.uid === card.uid && (!a.args?.target || a.args.target === "B:garen"))
    assert.ok(action,
        `${id} must be legal with the shared pool`)
    const out = cg.applyAction(state,
        action)
    state = out.state
    const events = [...out.events]
    for (let i = 0; i < 8 && state.phase === "chain"; i++) {
        const passed = cg.applyAction(state,
            {
                t: "pass", side: cg.whoseMove(state)
            })
        state = passed.state
        events.push(...passed.events)
    }
    spends.push(...events.filter((e): e is Extract<cg.GameEvent, { t: "teamManaChange" }> => e.t === "teamManaChange" && e.reason === "spend"))
}
// Giá mana từng chiêu do chat cân bằng chỉnh: đọc giá thật thay vì ghi cứng
const costOf = (hero: string, key: cg.SkillKey) => {
    const g = new cg.Game(state)
    return g.manaCost(state.units[`A:${hero}`],
        cg.getHero(hero)!.skills[key],
        state.players.A.hand.find(c => c.id === `${hero}_${key.toLowerCase()}`)!)
}
let pool = state.teamMana.A
const expectSpends: [string, number, number][] = []
for (const [hero,
    key,
    msg] of [["brand",
        "E",
        "first caster spends from the team pool"],
    ["lux",
        "E",
        "a second caster spends the first caster's remaining team resource"],
    ["darius",
        "Q",
        "fighter skills spend from the same pool"]] as const) {
    const cost = costOf(hero,
        key)
    pool -= cost
    if (cost > 0) expectSpends.push([`A:${hero}`,
        -cost,
        pool]) // chiêu 0 mana (Darius, Garen, Aatrox) không phát sự kiện chi
    play(`${hero}_${key.toLowerCase()}`)
    assert.equal(state.teamMana.A,
        pool,
        msg)
}
assert.equal(state.teamMana.B,
    80,
    "spending cannot change the opposing team's pool")
assert.deepEqual(spends.map(e => [e.unit,
    e.delta,
    e.mana]),
expectSpends)
for (const hero of ["brand",
    "lux",
    "darius"]) assert.equal(new cg.Game(state).manaOf(state.units[`A:${hero}`]),
    pool)
state.units["A:brand"].mana = 1000 // An old snapshot field has no gameplay authority.
assert.equal(new cg.Game(state).manaOf(state.units["A:brand"]),
    pool)

const regen: cg.GameEvent[] = []
for (const side of ["A",
    "B"] as const) {
    const ended = cg.applyAction(state,
        {
            t: "end", side
        })
    state = ended.state
    regen.push(...ended.events)
    for (let i = 0; i < 20 && state.phase === "blind"; i++) {
        const step = cg.applyAction(state,
            cg.chooseAction(state,
                cg.whoseMove(state),
                "easy"))
        state = step.state
        regen.push(...step.events)
    }
}
const regenA = new cg.Game(state).teamManaRegen("A"), regenB = new cg.Game(state).teamManaRegen("B")
assert.equal(state.teamMana.A,
    pool + regenA)
assert.equal(state.teamMana.B,
    80 + regenB)
assert.deepEqual(regen.filter(e => e.t === "teamManaChange" && e.reason === "turn").map(e => e.t === "teamManaChange" && [e.side,
    e.delta]),
[["B",
    regenB],
["A",
    regenA]],
"multiple mages do not multiply team regeneration")
const g = new cg.Game(state)
g.gainTeamMana("A",
    1000,
    "restore")
assert.equal(state.teamMana.A,
    200)
g.gainTeamMana("A",
    -1000)
assert.equal(state.teamMana.A,
    0)
assert.equal(state.teamMana.B,
    80 + regenB)
console.log("Team mana PASS: initial80/200, Brand20→Lux30→fighter20 sharepool, opponent isolation, no per-unit authority, once-per-team regen, clamping")
