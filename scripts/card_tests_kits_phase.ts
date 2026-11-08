// Test hệ bước trong lượt (law.md "Trình tự lượt"). Chạy: npx tsx scripts/card_tests_kits_phase.ts [--only=battle] [--verbose]
// Gọi cg.applyAction trực tiếp để không qua lối tắt bỏ step của kit_test_util.
import assert from "node:assert/strict"
import {
    cg
} from "@starci/shared"
import {
    G, act, gm, mk, report, skill, sup, test, u,
    type Ev, type St
} from "./kit_test_util"

/** Đánh dấu trận dựng sẵn đang ở Main 1 của A như trận thật */
function main1(o: Parameters<typeof mk>[0]): St {
    const s = mk(o)
    s.step = "main1"
    return s
}
const stepOn = (s: St, side: "A" | "B" = "A") => act(s,
    {
        t: "step", side
    }).s
const legal = (s: St, side: "A" | "B" = "A") => cg.legalActions(s,
    side)
const canPlay = (s: St, uid: string, side: "A" | "B" = "A") => legal(s,
    side).some((a) => a.t === "play" && a.uid === uid)
const order = (ev: Ev, t: string) => ev.findIndex((e) => e.t === t)
const endOf = (s: St, side: "A" | "B") => {
    let r = act(s,
        {
            t: "end", side
        })
    const ev = [...r.ev]
    while (r.s.phase === "blind") {
        const a = cg.actorsOf(r.s)[0]
        const la = cg.legalActions(r.s,
            a)
        r = act(r.s,
            la.find((x) => x.t === "ready") ?? la[0])
        ev.push(...r.ev)
    }
    return {
        s: r.s, ev
    }
}

G("Trình tự")
test("lượt thật: Draw, Reward, Standby rồi dừng ở Main 1; hồi sinh và hồi mana trước Draw",
    () => {
        const s = main1({
            A: {
                brand: 2
            }, B: {
                garen: 2
            }
        })
        s.units["B:garen"].stacks.burn = 3
        s.teamMana = {
            A: 100, B: 100
        }
        s.ownTurns = {
            A: 5, B: 5
        }
        const r = endOf(s,
            "A")
        assert.equal(r.s.step,
            "main1")
        assert.equal(r.s.active,
            "B")
        const mana = order(r.ev,
                "teamManaChange"), draw = r.ev.findIndex((e) => e.t === "draw"), burn = r.ev.findIndex((e) => e.t === "damage" && e.target === "B:garen")
        assert.ok(mana >= 0 && mana < draw,
            "hồi mana trước Draw")
        assert.ok(draw < burn,
            "Bỏng Brand (Standby) sau Draw")
    })
test("Main 1 sang Battle sang Main 2, không quay lại, Main 2 không có nút chuyển",
    () => {
        const s = main1({
            A: {
                garen: 2
            }, B: {
                zed: 2
            }
        })
        const b = stepOn(s)
        assert.equal(b.step,
            "battle")
        const m2 = stepOn(b)
        assert.equal(m2.step,
            "main2")
        assert.ok(!legal(m2).some((a) => a.t === "step"))
        assert.throws(() => stepOn(m2))
    })
test("end hợp lệ ở Main 1, Battle, Main 2",
    () => {
        const s = main1({
            A: {
                garen: 2
            }, B: {
                zed: 2
            }
        })
        for (const st of [s,
            stepOn(s),
            stepOn(stepOn(s))]) {
            assert.ok(legal(st).some((a) => a.t === "end"),
                st.step)
            assert.equal(endOf(st,
                "A").s.active,
            "B")
        }
    })

G("Chặn theo bước")
test("Main: chiêu, đồ, ghép, Phép được; Đánh Thường và đòn không cần lá không",
    () => {
        const s = main1({
            A: {
                garen: 2
            }, B: {
                zed: 2
            }
        })
        const q = skill(s,
                "garen",
                "A",
                "Q"), b = sup(s,
                "basic"), it = sup(s,
                "item",
                "kiem_dai")
        s.players.A.hand.push(q,
            b,
            it)
        assert.ok(canPlay(s,
            q.uid))
        assert.ok(canPlay(s,
            it.uid))
        assert.ok(!canPlay(s,
            b.uid))
        assert.ok(!legal(s).some((a) => a.t === "attack"))
        assert.throws(() => act(s,
            {
                t: "play", side: "A", uid: b.uid, args: {
                    actor: "A:garen", target: "B:zed"
                }
            }))
    })
test("Battle: chỉ đòn đánh; chiêu và đồ không dùng được",
    () => {
        const s = main1({
            A: {
                garen: 2
            }, B: {
                zed: 2
            }
        })
        const q = skill(s,
                "garen",
                "A",
                "Q"), b = sup(s,
                "basic"), it = sup(s,
                "item",
                "kiem_dai")
        s.players.A.hand.push(q,
            b,
            it)
        const t = stepOn(s)
        assert.ok(!canPlay(t,
            q.uid))
        assert.ok(!canPlay(t,
            it.uid))
        assert.ok(canPlay(t,
            b.uid))
        assert.ok(legal(t).some((a) => a.t === "attack" && a.cardless),
            "đòn không cần lá")
        assert.throws(() => act(t,
            {
                t: "play", side: "A", uid: q.uid, args: {
                }
            }))
    })
test("Main 2 dùng chiêu được, không đánh được",
    () => {
        const s = main1({
            A: {
                garen: 2
            }, B: {
                zed: 2
            }
        })
        const q = skill(s,
                "garen",
                "A",
                "Q"), b = sup(s,
                "basic")
        s.players.A.hand.push(q,
            b)
        const m2 = stepOn(stepOn(s))
        assert.ok(canPlay(m2,
            q.uid))
        assert.ok(!canPlay(m2,
            b.uid))
    })
test("Quick nối Chuỗi vẫn theo điều kiện cũ ở Battle của đối thủ",
    () => {
        const s = main1({
            A: {
                garen: 2
            }, B: {
                lux: 2
            }
        })
        s.units["A:garen"].hp = s.units["A:garen"].maxHp = 9000
        s.players.B.hand.push(skill(s,
            "lux",
            "B",
            "Q"))
        const b = sup(s,
            "basic")
        s.players.A.hand.push(b)
        const r = act(stepOn(s),
            {
                t: "play", side: "A", uid: b.uid, args: {
                    actor: "A:garen", target: "B:lux"
                }
            })
        assert.equal(r.s.phase,
            "chain")
        assert.ok(legal(r.s,
            "B").some((a) => a.t === "chain"),
        "Lux Q nối Chuỗi")
        assert.equal(r.s.step,
            "battle")
    })
test("đòn do chiêu gọi không bị chặn: Renata R ở Main 1 vẫn làm địch đánh",
    () => {
        const s = main1({
            A: {
                renata: 2, darius: 1
            }, B: {
                garen: 2, zed: 1
            }
        })
        const c = skill(s,
            "renata",
            "A",
            "R")
        s.players.A.hand.push(c)
        const r = act(s,
            {
                t: "play", side: "A", uid: c.uid, args: {
                }
            })
        let cur = r
        const ev = [...r.ev]
        while (cur.s.phase === "chain" && cur.s.chain) {
            cur = act(cur.s,
                {
                    t: "pass", side: cur.s.chain.priority
                })
            ev.push(...cur.ev)
        }
        assert.ok(ev.some((e) => e.t === "attack"),
            "có đòn đánh trong Main 1")
    })
test("nút tướng: Gangplank Úp Lá ở Main, không ở Battle; Standby tự qua khi không có nút",
    () => {
        const s = main1({
            A: {
                gangplank: 2
            }, B: {
                zed: 2
            }
        })
        s.players.A.hand.push(sup(s,
            "gold"))
        assert.ok(legal(s).some((a) => a.t === "ability"))
        assert.ok(!legal(stepOn(s)).some((a) => a.t === "ability"))
        const n = endOf(s,
            "A")
        assert.equal(n.s.step,
            "main1",
            "không dừng Standby")
    })

G("Kit theo thứ tự mới")
test("Twisted Fate Thần Bài: onMainStart chạy khi vào Main 1, sau Draw",
    () => {
        const s = main1({
            A: {
                zed: 2
            }, B: {
                twistedfate: 2
            }
        })
        const r = endOf(s,
            "A")
        const made = r.ev.findIndex((e) => e.t === "create" && e.card.id === "tf_fate")
        assert.ok(made > r.ev.findIndex((e) => e.t === "draw"),
            "Thần Bài xem lá sau khi rút")
    })
test("Kog'Maw Đói và Vayne Đêm cộng ở Standby, sau Draw",
    () => {
        const s = main1({
            A: {
                zed: 2
            }, B: {
                kogmaw: 2
            }
        })
        const before = u(s,
            "B",
            "kogmaw").stacks.hunger ?? 0
        const r = endOf(s,
            "A")
        assert.ok((u(r.s,
            "B",
            "kogmaw").stacks.hunger ?? 0) > before)
        const draw = r.ev.findIndex((e) => e.t === "draw")
        const stack = r.ev.findIndex((e) => e.t === "stack" && e.key === "hunger")
        assert.ok(draw < stack)
    })
test("Pháp sư nhận lá tạm ở Reward, trước Standby",
    () => {
        const s = main1({
            A: {
                zed: 2
            }, B: {
                lux: 2
            }
        })
        const r = endOf(s,
            "A")
        assert.ok(r.s.players.B.hand.some((c) => c.temp && c.hero === "lux"))
    })
test("Zed Liên Hoàn: combo vẫn tính qua Main 1, Battle, Main 2 của một lượt, hết khi end",
    () => {
        const s = main1({
            A: {
                zed: 2
            }, B: {
                garen: 2
            }
        })
        s.units["B:garen"].hp = s.units["B:garen"].maxHp = 9000
        const c = skill(s,
            "zed",
            "A",
            "Q")
        s.players.A.hand.push(c)
        const b = sup(s,
            "basic")
        s.players.A.hand.push(b)
        const q = act(s,
            {
                t: "play", side: "A", uid: c.uid, args: {
                }
            }).s
        const t = stepOn(q)
        const a = act(t,
            {
                t: "play", side: "A", uid: b.uid, args: {
                    actor: "A:zed", target: "B:garen"
                }
            }).s
        assert.equal(u(a,
            "A",
            "zed").stacks.zed_chain,
        2)
        assert.equal(u(endOf(a,
            "A").s,
        "A",
        "zed").stacks.zed_chain,
        0)
        void gm
    })

test("Dàn xếp bài rút: lá ghi trong rig lên đầu bộ đúng thứ tự, lá của bên kia bỏ qua",
    () => {
        const { state } = cg.newGameEx(7,
            ["sylas",
                "leona",
                "jinx",
                "ornn",
                "nami"],
            ["mel",
                "jayce",
                "azir",
                "darius",
                "soraka"],
            {
            },
            ["sylas_r",
                "mel_e",
                "sylas_e",
                "mel_r"])
        const top = (side: "A" | "B") => [...state.players[side].hand,
            ...state.players[side].deck].map((c) => c.id)
        assert.deepEqual(top("A").slice(0,
            2),
        ["sylas_r",
            "sylas_e"])
        assert.deepEqual(top("B").slice(0,
            2),
        ["mel_e",
            "mel_r"])
    })
report()
