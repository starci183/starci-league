// Test thế cờ dựng sẵn (cg.applyStage) với các tuỳ chọn thêm cho màn Hướng dẫn. Chạy: npx tsx scripts/card_tests_kits_stage.ts [--verbose]
import assert from "node:assert/strict"
import {
    cg
} from "@starci/shared"
import {
    G, report, test
} from "./kit_test_util"

const TEAM_A = ["rumble",
    "leona",
    "lux",
    "teemo",
    "azir"]
const TEAM_B = ["darius",
    "garen",
    "ashe",
    "ahri",
    "zed"]

G("Thế cờ")
test("applyStage: mộ bài, đỉnh bộ, mana đội, bước, Máu %, trạng thái, Khiên, Lính, Dao, Nguyên Tố, lá băng",
    () => {
        const s = cg.newGame(7,
            TEAM_A,
            TEAM_B)
        const deckB = s.players.B.deck.length
        cg.applyStage(s,
            {
                board: {
                    rumble: 2, leona: 1, azir: 3, darius: 2, garen: 1
                },
                hands: {
                    rumble: ["leona_q"], darius: ["darius_q",
                        "garen_e"]
                },
                first: "rumble",
                step: "battle",
                hpPct: {
                    darius: 0.25
                },
                items: {
                    leona: ["giap_luoi"]
                },
                statuses: {
                    garen: {
                        isolated: {
                            turns: 1
                        }
                    }
                },
                shield: {
                    leona: 120
                },
                grave: {
                    rumble: ["velkoz_e",
                        "lux_q"]
                },
                deckTop: {
                    darius: [{
                        kind: "special", id: "mushroom", hero: "teemo", side: "A"
                    },
                    "gold"]
                },
                teamMana: {
                    A: 150
                },
                laneStacks: {
                    A: {
                        3: {
                            azir_soldiers: 2
                        }
                    }
                },
                markers: {
                    A: {
                        4: ["dagger"]
                    }
                },
                laneElements: ["earth",
                    "water",
                    "grass",
                    "earth",
                    "water"],
                frozen: {
                    lux: ["garen_e"]
                },
            })
        const g = new cg.Game(s)
        assert.equal(s.step,
            "battle")
        assert.equal(s.active,
            "A")
        assert.equal(s.teamMana.A,
            150)
        assert.equal(s.teamMana.B,
            200)
        const darius = s.units["B:darius"]
        assert.equal(darius.hp,
            Math.round(darius.maxHp * 0.25))
        assert.deepEqual(s.units["A:leona"].items,
            ["giap_luoi"])
        assert.ok(g.has(s.units["B:garen"],
            "isolated"))
        assert.equal(s.units["A:leona"].shield,
            120)
        // lá chiêu của tướng ngoài đội vẫn là lá chiêu thật (Rumble Tái Chế lấy được)
        assert.deepEqual(s.players.A.grave.map((c) => [c.kind,
            c.id,
            c.hero,
            c.side]),
        [["skill",
            "velkoz_e",
            "velkoz",
            "A"],
        ["skill",
            "lux_q",
            "lux",
            "A"]])
        assert.equal(s.players.B.deck[0].id,
            "mushroom")
        assert.equal(s.players.B.deck[1].id,
            "gold")
        assert.equal(s.players.B.deck.length,
            deckB - 2 + 1,
            "lá lấy từ bộ không bị nhân đôi, lá dựng sẵn được thêm")
        assert.equal(g.laneStackOf("A",
            3,
            "azir_soldiers"),
        2)
        assert.deepEqual(g.markersAt("A",
            4),
        ["dagger"])
        assert.equal(s.laneElements?.[2],
            "grass")
        const frozen = s.players.B.hand.find((c) => c.id === "garen_e")
        assert.equal(frozen?.frozen,
            "A:lux")
        // Rumble Tái Chế (chỉ ở Main) thấy được lá mộ dựng sẵn: vứt Leona Q, lấy Vel'Koz E hoặc Lux Q
        s.step = "main1"
        const recycle = cg.legalActions(s,
            "A").filter((a) => a.t === "ability" && a.id === "rumble_recycle")
        assert.equal(recycle.length,
            2)
    })

test("applyStage không đổi hành vi cũ khi không có tuỳ chọn thêm",
    () => {
        const s = cg.newGame(3,
            TEAM_A,
            TEAM_B)
        cg.applyStage(s,
            {
                board: {
                    lux: 2, garen: 2
                }, hands: {
                    lux: ["lux_q"]
                }, first: "lux"
            })
        assert.equal(s.step,
            "main1")
        assert.deepEqual(s.teamMana,
            {
                A: 200, B: 200
            })
        assert.equal(s.players.A.hand[0].kind,
            "skill")
        assert.ok(cg.legalActions(s,
            "A").some((a) => a.t === "play" && a.uid === s.players.A.hand[0].uid))
    })

report()
