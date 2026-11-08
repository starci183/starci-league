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

/** Trigger tuỳ biến: loại, nhắm một tướng hay cả phe, nhắm tướng nào */
type Aim = { single?: boolean; at?: "self" | "ally" }
function aim(f: Fixture, kind: cg.Trigger["kind"], o: Aim = {
}): cg.Trigger {
    const single = o.single ?? true
    return {
        ...trigger(f,
            kind),
        single, multi: !single, target: single ? (o.at === "ally" ? "A:rx_ally" : f.hero.id) : undefined,
        card: kind === "attack" ? f.game.supportCard("basic") : kind === "support" ? f.game.supportCard("spell_ignite") : f.game.skillCard("rx_actor",
            "B",
            single ? "Q" : "E")
    }
}
const reacts = (hero: string, key: cg.SkillKey, kind: cg.Trigger["kind"], o: Aim = {
}) => {
    const f = fixture(hero,
        key,
        true)
    return responses(f,
        aim(f,
            kind,
            o)).length > 0
}
/** Mở chuỗi thật bằng một Đánh Thường lên `at`, rồi nối bằng lá phản ứng (không ném lỗi) */
function chainRealAttack(hero: string, key: cg.SkillKey, at: "self" | "ally") {
    const f = fixture(hero,
        key,
        at === "ally")
    const target = at === "ally" ? "A:rx_ally" : f.hero.id
    const attack = f.game.supportCard("basic")
    f.state.players.B.hand = [attack]
    const opened = cg.applyAction(f.state,
        {
            t: "play", side: "B", uid: attack.uid, args: {
                actor: "B:rx_actor", target
            }
        })
    const valid = cg.legalActions(opened.state,
        "A").find((action) => action.t === "chain" && action.uid === f.card.uid)
    assert.ok(valid,
        `${hero} ${key}: đòn đánh thật mở phản ứng hợp lệ`)
    assert.doesNotThrow(() => cg.applyAction(opened.state,
        valid))
}

// Quick "khi địch nhắm đúng tướng này": đáp đòn đánh, chiêu và lá hỗ trợ nhắm đúng mình; không đáp đòn nhắm đồng minh hay cả phe
for (const [hero,
    key] of [["annie",
        "E"],
    ["garen",
        "E"],
    ["viktor",
        "Q"],
    ["lux",
        "Q"],
    ["rumble",
        "E"],
    ["lissandra",
        "R"],
    ["vayne",
        "Q"],
    ["zed",
        "E"],
    ["khazix",
        "R"]] as const) {
    test(`${hero} ${key}: chỉ đáp khi địch nhắm đúng một mình tướng này`,
        () => {
            for (const kind of ["attack",
                "skill",
                "support"] as const) assert.ok(reacts(hero,
                key,
                kind),
            `${kind} nhắm đúng mình`)
            assert.ok(!reacts(hero,
                key,
                "skill",
                {
                    single: false
                }),
            "chiêu cả phe không phải chỉ định đơn")
            assert.ok(!reacts(hero,
                key,
                "attack",
                {
                    at: "ally"
                }),
            "đòn nhắm đồng minh")
            assert.ok(!reacts(hero,
                key,
                "skill",
                {
                    at: "ally"
                }),
            "chiêu nhắm đồng minh")
            chainRealAttack(hero,
                key,
                "self")
        })
}

for (const hero of ["teemo",
    "jinx"]) {
    test(`${hero} E: chỉ đáp ĐÒN ĐÁNH, không đáp chiêu hay lá hỗ trợ`,
        () => {
            assert.ok(reacts(hero,
                "E",
                "attack"))
            assert.ok(!reacts(hero,
                "E",
                "skill"))
            assert.ok(!reacts(hero,
                "E",
                "support"))
            chainRealAttack(hero,
                "E",
                "self")
        })
}
test("Jinx E đáp đòn đánh nhắm bất kỳ đồng minh; Teemo E chỉ đáp đòn nhắm chính Teemo",
    () => {
        assert.ok(reacts("jinx",
            "E",
            "attack",
            {
                at: "ally"
            }))
        assert.ok(!reacts("teemo",
            "E",
            "attack",
            {
                at: "ally"
            }))
        chainRealAttack("jinx",
            "E",
            "ally")
    })

for (const hero of ["nami",
    "janna",
    "renata"]) {
    test(`${hero} E: đáp mọi chỉ định đơn nhắm tướng mình (kể cả chính nó), không đáp chỉ định cả phe`,
        () => {
            for (const kind of ["attack",
                "skill",
                "support"] as const) for (const at of ["self",
                "ally"] as const) assert.ok(reacts(hero,
                "E",
                kind,
                {
                    at
                }),
            `${kind} @${at}`)
            assert.ok(!reacts(hero,
                "E",
                "skill",
                {
                    single: false
                }))
            chainRealAttack(hero,
                "E",
                "ally")
        })
}

test("Soraka E chỉ đáp chỉ định đơn nhắm tướng mình KHÁC Soraka; Braum E chỉ đáp đòn đánh/chiêu nhắm đồng minh khác, không đáp lá hỗ trợ",
    () => {
        for (const kind of ["attack",
            "skill",
            "support"] as const) {
            assert.ok(reacts("soraka",
                "E",
                kind,
                {
                    at: "ally"
                }))
            assert.ok(!reacts("soraka",
                "E",
                kind,
                {
                    at: "self"
                }))
        }
        assert.ok(!reacts("soraka",
            "E",
            "skill",
            {
                single: false
            }))
        assert.ok(reacts("braum",
            "E",
            "attack",
            {
                at: "ally"
            }))
        assert.ok(reacts("braum",
            "E",
            "skill",
            {
                at: "ally"
            }))
        assert.ok(!reacts("braum",
            "E",
            "support",
            {
                at: "ally"
            }))
        assert.ok(!reacts("braum",
            "E",
            "attack",
            {
                at: "self"
            }))
        assert.ok(!reacts("braum",
            "E",
            "skill",
            {
                single: false
            }))
        chainRealAttack("soraka",
            "E",
            "ally")
        chainRealAttack("braum",
            "E",
            "ally")
    })

test("Leona E / Malphite E / Ornn R: đáp đòn đánh và chiêu (chỉ định đơn lẫn cả phe), không đáp lá hỗ trợ",
    () => {
        for (const [hero,
            key] of [["leona",
                "E"],
            ["malphite",
                "E"],
            ["ornn",
                "R"]] as const) {
            for (const single of [true,
                false]) {
                assert.ok(reacts(hero,
                    key,
                    "attack",
                    {
                        single
                    }),
                `${hero} attack single=${single}`)
                assert.ok(reacts(hero,
                    key,
                    "skill",
                    {
                        single
                    }),
                `${hero} skill single=${single}`)
            }
            assert.ok(!reacts(hero,
                key,
                "support"),
            `${hero} không đáp lá hỗ trợ`)
            chainRealAttack(hero,
                key,
                "ally")
        }
    })

test("Blitzcrank E (Chỉ Nối Chuỗi) đáp lá chiêu địch, đơn hay cả phe; không đáp đòn đánh hay lá hỗ trợ",
    () => {
        assert.ok(reacts("blitzcrank",
            "E",
            "skill"))
        assert.ok(reacts("blitzcrank",
            "E",
            "skill",
            {
                single: false
            }))
        assert.ok(reacts("blitzcrank",
            "E",
            "skill",
            {
                at: "ally"
            }))
        assert.ok(!reacts("blitzcrank",
            "E",
            "attack"))
        assert.ok(!reacts("blitzcrank",
            "E",
            "support"))
    })

test("Janna R đáp chiêu nhắm nhiều tướng mình / cả phe; không đáp chỉ định đơn, đòn đánh hay lá hỗ trợ",
    () => {
        assert.ok(reacts("janna",
            "R",
            "skill",
            {
                single: false
            }))
        assert.ok(!reacts("janna",
            "R",
            "skill"))
        assert.ok(!reacts("janna",
            "R",
            "attack"))
        assert.ok(!reacts("janna",
            "R",
            "support"))
    })

test("Quick có điều kiện thêm về bàn (Ornn E cần tướng mang đồ, Katarina E cần đường có Dao, Qiyana E cần đứng đường Cỏ): thiếu điều kiện thì không đáp",
    () => {
        for (const [hero,
            key] of [["ornn",
                "E"],
            ["katarina",
                "E"],
            ["qiyana",
                "E"]] as const) {
            assert.ok(!reacts(hero,
                key,
                "attack"),
            `${hero} ${key} đáp đòn dù thiếu điều kiện bàn`)
            assert.ok(!reacts(hero,
                key,
                "skill"),
            `${hero} ${key} đáp chiêu dù thiếu điều kiện bàn`)
        }
    })

test("Mọi lá không-Quick của tướng thật không phản ứng với bất kỳ trigger nào (chỉ đánh chủ động)",
    () => {
        for (const def of cg.implementedHeroes().filter((h) => !h.id.startsWith("rx_") && !h.id.startsWith("t_"))) {
            for (const sk of Object.values(def.skills)) {
                if (sk.quick) continue
                const f = fixture(def.id,
                    sk.key,
                    true)
                for (const kind of ["attack",
                    "skill",
                    "support"] as const) for (const single of [true,
                    false]) {
                    assert.equal(responses(f,
                        aim(f,
                            kind,
                            {
                                single
                            })).length,
                    0,
                    `${def.id} ${sk.key} không Quick mà phản ứng ${kind}`)
                }
            }
        }
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
