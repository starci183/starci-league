// Điều kiện Quick phải khớp mắt xích ngay trước, không chỉ nhãn Quick.
import assert from "node:assert/strict"
import {
    cg
} from "@starci/shared"

let passed = 0, failed = 0
function test(name: string, run: () => void) {
    try {
        run()
        passed++
        console.log(`PASS  ${name}`)
    } catch (error) {
        failed++
        console.log(`FAIL  ${name}\n        -> ${(error as Error).message}`)
    }
}

const emptySkill = (key: cg.SkillKey): cg.SkillDef => ({
    key, name: "-", desc: "-", target: "none", resolve: () => {}
})
for (const [id,
    role] of [["rx_actor",
        "marksman"],
    ["rx_ally",
        "tank"],
    ["rx_unscoped",
        "fighter"]] as const) cg.defineHero({
    id, name: id, role, damage: "physical", hp: 1000, atk: 40, armor: 0, mr: 0,
    passive: {
        name: "-", desc: "-"
    },
    skills: {
        Q: id === "rx_actor" ? {
            key: "Q", name: "Targeted spell", desc: "Deal 10 damage to one enemy.", target: "enemy",
            resolve(c) { c.g.damage(c.self,
                c.target!,
                10,
                "magic",
                {
                    tag: "skill"
                }) }
        } : id === "rx_unscoped" ? {
            ...emptySkill("Q"), name: "Quick without a condition", quick: true
        } : emptySkill("Q"),
        E: id === "rx_actor" ? {
            key: "E", name: "Every enemy", desc: "Deal 10 damage to every enemy.", target: "all_enemies",
            resolve(c) { for (const target of c.g.heroes(c.side === "A" ? "B" : "A")) c.g.damage(c.self,
                target,
                10,
                "magic",
                {
                    tag: "skill"
                }) }
        } : emptySkill("E"),
        R: emptySkill("R")
    }
})

function fixture(hero: string, key: cg.SkillKey, ally = false) {
    const team = [...new Set([hero,
        "rx_ally",
        "leona",
        "garen",
        "lux",
        "ashe",
        "braum"])].slice(0,
        5)
    const state = cg.newGame(20261030,
        team,
        ["rx_actor",
            "darius",
            "aatrox",
            "vayne",
            "zed"])
    state.round = 20
    state.turnNo = 10
    state.active = "B"
    const game = new cg.Game(state)
    game.summon("A",
        hero,
        2)
    if (ally) game.summon("A",
        "rx_ally",
        1)
    game.summon("B",
        "rx_actor",
        2)
    state.phase = "main"
    state.chain = null
    state.firstTurnDone = {
        A: true, B: true
    }
    for (const side of cg.SIDES) { state.players[side].hand = []; state.players[side].grave = [] }
    const card = game.skillCard(hero,
        "A",
        key)
    state.players.A.hand = [card]
    return {
        state, game, card, hero: state.units[`A:${hero}`], target: ally ? "A:rx_ally" : `A:${hero}`
    }
}
type Fixture = ReturnType<typeof fixture>
function trigger(f: Fixture, kind: cg.Trigger["kind"]): cg.Trigger {
    return {
        kind, side: "B", actor: "B:rx_actor", target: f.target, single: true,
        card: kind === "attack" ? f.game.supportCard("basic") : f.game.skillCard("rx_actor",
            "B",
            "Q"),
        redirectable: [f.hero.id,
            "A:rx_ally"]
    }
}
const responses = (f: Fixture, event: cg.Trigger) => cg.chainOptions(f.game,
    "A",
    event).filter((option) => option.card.uid === f.card.uid)

for (const hero of ["braum",
    "malphite",
    "renata",
    "ornn",
    "jinx",
    "katarina",
    "teemo",
    "qiyana"]) test(`${hero} E: chỉ đáp đòn đánh; từ chối chiêu chỉ định cùng mục tiêu`,
    () => {
        const withAlly = ["braum",
            "renata",
            "ornn"].includes(hero)
        const f = fixture(hero,
            "E",
            withAlly)
        assert.ok(responses(f,
            trigger(f,
                "attack")).length)
        assert.equal(responses(f,
            trigger(f,
                "skill")).length,
        0)
        const attack = f.game.supportCard("basic")
        f.state.players.B.hand = [attack]
        const opened = cg.applyAction(f.state,
            {
                t: "play", side: "B", uid: attack.uid, args: {
                    actor: "B:rx_actor", target: f.target
                }
            })
        const valid = cg.legalActions(opened.state,
            "A").find((action) => action.t === "chain" && action.uid === f.card.uid)
        assert.ok(valid,
            "đòn đánh thật mở phản ứng hợp lệ")
        assert.doesNotThrow(() => cg.applyAction(opened.state,
            valid))
        const negative = fixture(hero,
            "E",
            withAlly)
        const skill = negative.game.skillCard("rx_actor",
            "B",
            "Q")
        negative.state.players.B.hand = [skill]
        const resolved = cg.applyAction(negative.state,
            {
                t: "play", side: "B", uid: skill.uid, args: {
                    target: negative.target
                }
            })
        assert.equal(resolved.state.phase,
            "main",
            "chiêu gây sát thương không thành đòn đánh")
        assert.throws(() => cg.applyAction(resolved.state,
            {
                t: "chain", side: "A", uid: negative.card.uid
            }))
    })

for (const [hero,
    key] of [["aatrox",
        "E"],
    ["braum",
        "R"],
    ["janna",
        "E"],
    ["khazix",
        "R"],
    ["lissandra",
        "R"],
    ["missfortune",
        "E"],
    ["vayne",
        "Q"]] as const) test(`${hero} ${key}: không có điều kiện thì chỉ đánh chủ động`,
    () => {
        // Vayne Q swap với một đồng minh (bàn luôn đầy): fixture cần có đồng minh trên sân
        const f = fixture(hero,
            key,
            hero === "vayne")
        assert.equal(responses(f,
            trigger(f,
                "attack")).length,
        0)
        assert.equal(responses(f,
            trigger(f,
                "skill")).length,
        0)
        assert.ok(cg.playOptions(f.game,
            "A",
            f.card).length,
        "giữ nguyên khả năng đánh chủ động")
    })

test("Leona E chỉ đáp chiêu/đòn đánh; Janna R đáp đòn đánh/lá chiêu nhắm tướng mình, không đáp lá hỗ trợ",
    () => {
        const leona = fixture("leona",
            "E")
        assert.ok(responses(leona,
            trigger(leona,
                "skill")).length)
        assert.ok(responses(leona,
            trigger(leona,
                "attack")).length)
        assert.equal(responses(leona,
            trigger(leona,
                "support")).length,
        0)
        const janna = fixture("janna",
            "R")
        assert.ok(responses(janna,
            trigger(janna,
                "attack")).length)
        assert.ok(responses(janna,
            trigger(janna,
                "skill")).length)
        assert.equal(responses(janna,
            trigger(janna,
                "support")).length,
        0)
    })

for (const hero of ["annie",
    "soraka"]) test(`${hero} E: mọi địch không thành chỉ định đơn dù chỉ có 1 địch trên sân`,
    () => {
        const f = fixture(hero,
            "E")
        assert.ok(responses(f,
            trigger(f,
                "skill")).length)
        const area = f.game.skillCard("rx_actor",
            "B",
            "E")
        f.state.players.B.hand = [area]
        const result = cg.applyAction(f.state,
            {
                t: "play", side: "B", uid: area.uid
            })
        assert.equal(result.state.phase,
            "main")
        assert.ok(result.state.players.A.hand.some((card) => card.uid === f.card.uid),
            "không tự dùng lá phản ứng")
    })

test("Annie đủ 4 Lửa vẫn huỷ lá bổ trợ chỉ định mình dù lá đó không có tướng tung",
    () => {
        const f = fixture("annie",
            "E")
        f.hero.stacks.fire = 4
        const ignite = f.game.supportCard("spell_ignite")
        f.state.players.B.hand = [ignite]
        const opened = cg.applyAction(f.state,
            {
                t: "play", side: "B", uid: ignite.uid, args: {
                    target: f.hero.id
                }
            })
        const response = cg.legalActions(opened.state,
            "A").find((action) => action.t === "chain" && action.uid === f.card.uid)
        assert.ok(response)
        const result = cg.applyAction(opened.state,
            response)
        assert.equal(result.state.units[f.hero.id].stacks.fire,
            0)
        assert.ok(!result.state.units[f.hero.id].statuses.ignite)
        assert.ok(result.events.some((event) => event.t === "chainCancel"))
    })

test("Quick thiếu quickWhen không được nối, kể cả khi chuỗi đã mở và client gửi hành động giả",
    () => {
        const f = fixture("rx_unscoped",
            "Q")
        assert.equal(responses(f,
            trigger(f,
                "attack")).length,
        0)
        f.game.summon("A",
            "leona",
            1)
        const guard = f.game.skillCard("leona",
            "A",
            "E")
        f.state.players.A.hand = [f.card,
            guard]
        const card = f.game.skillCard("rx_actor",
            "B",
            "Q")
        f.state.players.B.hand = [card]
        const opened = cg.applyAction(f.state,
            {
                t: "play", side: "B", uid: card.uid, args: {
                    target: f.hero.id
                }
            })
        assert.equal(opened.state.phase,
            "chain")
        assert.ok(!cg.legalActions(opened.state,
            "A").some((action) => action.t === "chain" && action.uid === f.card.uid))
        const before = JSON.stringify(opened.state)
        assert.throws(() => cg.applyAction(opened.state,
            {
                t: "chain", side: "A", uid: f.card.uid
            }))
        assert.equal(JSON.stringify(opened.state),
            before)
    })

test("Trigger thiếu loại hành động hoặc từ chính mình không được phản ứng",
    () => {
        const f = fixture("annie",
            "E")
        assert.equal(responses(f,
            trigger(f,
                undefined)).length,
        0)
        assert.equal(responses(f,
            {
                ...trigger(f,
                    "attack"), side: "A"
            }).length,
        0)
    })

test("Mọi Quick của tướng thật đều có quickWhen và điều kiện hiện ngay trên mô tả",
    () => {
        for (const hero of cg.implementedHeroes().filter((hero) => !hero.id.startsWith("rx_"))) {
            for (const skill of Object.values(hero.skills)) if (skill.quick) {
                assert.equal(typeof skill.quickWhen,
                    "function",
                    `${hero.id} ${skill.key} thiếu quickWhen`)
                assert.match(skill.desc,
                    /Khi địch|khi địch/,
                    `${hero.id} ${skill.key} thiếu điều kiện trên lá`)
            }
        }
    })

console.log(`\nTỔNG: ${passed + failed} test | PASS ${passed} | FAIL ${failed}`)
process.exit(failed ? 1 : 0)
