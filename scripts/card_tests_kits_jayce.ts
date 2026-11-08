// Test bộ chiêu Jayce (đổi vai Đấu sĩ/Xạ thủ) và tương tác. Chạy: npx tsx scripts/card_tests_kits_jayce.ts [--only=dạng] [--verbose]
// Mọi kỳ vọng tính từ cg.kit(id).p và chỉ số engine, nên sửa balance/heroes/*.json không làm vỡ test.
import assert from "node:assert/strict"
import {
    cg
} from "@starci/shared"
import {
    G, act, basic, cast, dmgOn, endTurn, gm, mk, report, skill, sup, test, u,
    type Act, type Ev, type S, type St
} from "./kit_test_util"

Object.assign(cg.kit("sylas").raw.flags,
    {
        stealOnlyR: false, stealToHand: true
    }) // các test này phủ đường đoạt Q, E và lá lên tay
const kj = cg.kit("jayce"), p = kj.p
const tank = (s: St, side: S, hero: string) => { const x = u(s,
    side,
    hero); x.maxHp = x.hp = 9000 }
const mit = (raw: number, def: number) => Math.round(raw * 100 / (100 + def))
const armorOf = (s: St, side: S, h: string) => gm(s).armor(u(s,
    side,
    h))
type ChainAct = Extract<Act, { t: "chain" }>
type PlayAct = Extract<Act, { t: "play" }>
function passAll(s0: St, ev0: Ev = []): { s: St; ev: Ev } {
    let s = s0
    const ev = [...ev0]
    while (s.phase === "chain" && s.chain) {
        const r = act(s,
            {
                t: "pass", side: s.chain.priority
            })
        s = r.s
        ev.push(...r.ev)
    }
    return {
        s, ev
    }
}
const hammer = (b: Record<string, number> = {
    garen: 2, teemo: 1, zed: 3
}) => {
    const s = mk({
        A: {
            jayce: 2
        }, B: b, modes: {
            jayce: "hammer"
        }
    })
    for (const h of Object.keys(b)) tank(s,
        "B",
        h)
    return s
}
const cannon = (b: Record<string, number> = {
    garen: 2, teemo: 1, zed: 3
}) => {
    const s = mk({
        A: {
            jayce: 2
        }, B: b, modes: {
            jayce: "cannon"
        }
    })
    for (const h of Object.keys(b)) tank(s,
        "B",
        h)
    return s
}
/** Đổi dạng thật: nút chỉ có ở Standby, nên đặt lượt về Standby rồi bấm nút; xong bỏ step để test bộ chiêu không xét bước */
function shift(s0: St) {
    s0.step = "standby"
    const r = act(s0,
        {
            t: "ability", side: "A", unit: "A:jayce", id: "jayce_swap", args: {
            }
        })
    delete u(r.s,
        "A",
        "jayce").stacks["once:jayce_swap"]
    r.s.step = undefined
    return r
}
const basicTargets = (s: St) => {
    const c = sup(s,
        "basic")
    s.players.A.hand.push(c)
    const out = (cg.legalActions(s,
        "A").filter((a) => a.t === "play" && a.uid === c.uid) as PlayAct[]).filter((a) => a.args?.actor === "A:jayce").map((a) => a.args?.target)
    s.players.A.hand = s.players.A.hand.filter((x) => x.uid !== c.uid)
    return out
}
const cardless = (s: St) => cg.legalActions(s,
    "A").filter((a) => a.t === "attack" && a.cardless && a.actor === "A:jayce").length

G("Dạng và vai")
test("gọi theo chế độ: stack jayce_form, g.role đúng",
    () => {
        const h = hammer(), c = cannon()
        assert.equal(u(h,
            "A",
            "jayce").stacks.jayce_form,
        0)
        assert.equal(gm(h).role(u(h,
            "A",
            "jayce")),
        "fighter")
        assert.equal(u(c,
            "A",
            "jayce").stacks.jayce_form,
        1)
        assert.equal(gm(c).role(u(c,
            "A",
            "jayce")),
        "marksman")
    })
test("đổi dạng đổi vai và đổi tập mục tiêu đòn đánh",
    () => {
        const s = hammer()
        assert.deepEqual(basicTargets(s),
            ["B:garen"],
            "Búa chỉ đánh đối diện")
        const r = shift(s)
        assert.equal(gm(r.s).role(u(r.s,
            "A",
            "jayce")),
        "marksman")
        assert.ok(basicTargets(r.s).length >= 3,
            "Pháo đánh mọi đường")
        const b = shift(cannon())
        assert.equal(gm(b.s).role(u(b.s,
            "A",
            "jayce")),
        "fighter")
    })
test("đòn không cần lá chỉ ở Búa",
    () => {
        assert.ok(cardless(hammer()) > 0)
        assert.equal(cardless(cannon()),
            0)
        assert.equal(cardless(shift(hammer()).s),
            0,
            "đổi sang Pháo mất đòn không cần lá")
    })
test("Pháo chịu luật buộc đánh Đỡ Đòn của xạ thủ",
    () => {
        const s = cannon({
            garen: 2, braum: 1
        })
        assert.deepEqual(basicTargets(s),
            ["B:braum"],
            "lá Đánh Thường của xạ thủ phải đánh Đỡ Đòn")
    })
test("hệ số đòn theo vai đổi theo dạng (RULES.roleAttack)",
    () => {
        const a = cg.RULES.roleAttack
        const h = hammer({
            garen: 2
        })
        const c = cannon({
            garen: 2
        })
        const dh = dmgOn(basic(h,
            "A",
            "A:jayce",
            "B:garen").ev,
        "B:garen")
        const dc = dmgOn(basic(c,
            "A",
            "A:jayce",
            "B:garen").ev,
        "B:garen")
        assert.ok(a.fighter === a.marksman ? dh === dc : dh !== dc,
            "đòn đọc vai hiện tại")
    })
test("Đại Bác Liên Thanh: dạng Búa cũng đánh mọi tướng địch; Pháo không đổi",
    () => {
        const s = hammer()
        gm(s).equip(u(s,
            "A",
            "jayce"),
        "dai_bac")
        assert.ok(basicTargets(s).length >= 3,
            "Búa có Đại Bác đánh mọi đường")
        const c = cannon()
        gm(c).equip(u(c,
            "A",
            "jayce"),
        "dai_bac")
        assert.ok(basicTargets(c).length >= 3)
    })
test("bot đọc vai theo dạng: Jayce Pháo vào được luồng bot không lỗi",
    () => {
        const s = cannon()
        for (const level of ["easy",
            "hard"] as const) assert.ok(cg.chooseAction(s,
            "A",
            level))
    })

G("Tăng Lực")
test("đòn kế sau đổi dạng thêm p1 + p2·AD, chỉ một lần",
    () => {
        const s = hammer({
            garen: 2
        })
        const base = dmgOn(basic(structuredClone(s),
            "A",
            "A:jayce",
            "B:garen").ev,
        "B:garen")
        const r = shift(s)
        const bonus = mit(gm(r.s).f(u(r.s,
            "A",
            "jayce"),
        kj.x("p1 + p2·AD")),
        armorOf(r.s,
            "B",
            "garen"))
        const a1 = basic(r.s,
            "A",
            "A:jayce",
            "B:garen")
        const a2 = basic(a1.s,
            "A",
            "A:jayce",
            "B:garen")
        const d1 = dmgOn(a1.ev,
                "B:garen"), d2 = dmgOn(a2.ev,
                "B:garen")
        assert.ok(Math.abs(d1 - d2 - bonus) <= 2,
            `Tăng Lực ${d1} - ${d2} ≈ ${bonus}`)
        assert.ok(base > 0)
        assert.equal(u(a2.s,
            "A",
            "jayce").stacks.jayce_charge,
        0)
    })
test("mất Tăng Lực khi chết; dạng giữ nguyên qua hồi sinh",
    () => {
        const r = shift(hammer())
        const me = u(r.s,
            "A",
            "jayce")
        assert.equal(me.stacks.jayce_charge,
            1)
        gm(r.s).kill(me)
        assert.equal(me.stacks.jayce_charge,
            0)
        assert.equal(me.stacks.jayce_form,
            1)
        let s = r.s
        for (let i = 0; i < 12 && u(s,
            "A",
            "jayce").status !== "board"; i++) {
            s = endTurn(s).s
        }
        assert.equal(u(s,
            "A",
            "jayce").status,
        "board",
        "đã hồi sinh")
        assert.equal(gm(s).role(u(s,
            "A",
            "jayce")),
        "marksman")
    })

G("Q, E theo dạng")
test("lá hiện đúng tên và chữ theo dạng, cả tiếng Anh",
    () => {
        const h = hammer(), c = cannon()
        const q = skill(h,
                "jayce",
                "A",
                "Q"), e = skill(h,
                "jayce",
                "A",
                "E")
        assert.ok(cg.cardInfo(gm(h),
            q).name.includes("Chỉ Thiên!"))
        assert.ok(!cg.cardInfo(gm(h),
            q).name.includes("Cầu Sấm"))
        assert.ok(cg.cardInfo(gm(h),
            e).name.includes("Lôi Phạt"))
        assert.ok(cg.cardInfo(gm(c),
            {
                ...q, side: "A"
            }).name.includes("Cầu Sấm"))
        assert.ok(cg.cardInfo(gm(c),
            {
                ...e, side: "A"
            }).desc.startsWith("Pháo:"))
        assert.ok(cg.cardInfo(gm(c),
            {
                ...q, side: "A"
            },
            undefined,
            "en").name.includes("Shock Blast"))
    })
test("Búa Q: địch bất kỳ đường, hoán đổi sang đối diện, q1 + q2·AD + q3·Máu tối đa",
    () => {
        const s = hammer()
        const raw = gm(s).f(u(s,
            "A",
            "jayce"),
        kj.x("q1 + q2·AD + q3·Máu tối đa"))
        const r = cast(s,
            "A",
            skill(s,
                "jayce",
                "A",
                "Q"),
            {
                target: "B:zed"
            })
        assert.equal(u(r.s,
            "A",
            "jayce").lane,
        3)
        assert.equal(dmgOn(r.ev,
            "B:zed"),
        mit(raw,
            armorOf(s,
                "B",
                "zed")))
    })
test("Pháo Q: không dời, 2 đường kề q6%",
    () => {
        const s = cannon()
        const raw = gm(s).f(u(s,
            "A",
            "jayce"),
        kj.x("q4 + q5·AD"))
        const r = cast(s,
            "A",
            skill(s,
                "jayce",
                "A",
                "Q"),
            {
                target: "B:garen"
            })
        assert.equal(u(r.s,
            "A",
            "jayce").lane,
        2)
        assert.equal(dmgOn(r.ev,
            "B:garen"),
        mit(raw,
            armorOf(s,
                "B",
                "garen")))
        assert.equal(dmgOn(r.ev,
            "B:teemo"),
        mit(raw * p.q6 / 100,
            armorOf(s,
                "B",
                "teemo")))
    })
test("Búa E: đối diện theo % Máu tối đa mục tiêu, Choáng e4",
    () => {
        const s = hammer()
        const raw = gm(s).f(u(s,
            "A",
            "jayce"),
        kj.x("e1 + e2·AD + e3% máu tối đa mục tiêu"),
        u(s,
            "B",
            "garen"))
        const r = cast(s,
            "A",
            skill(s,
                "jayce",
                "A",
                "E"))
        assert.equal(dmgOn(r.ev,
            "B:garen"),
        mit(raw,
            armorOf(s,
                "B",
                "garen")))
        assert.ok(u(r.s,
            "B",
            "garen").statuses.stun)
    })
const cannonBoard = () => {
    const s = mk({
        A: {
            jayce: 2, soraka: 1
        }, B: {
            garen: 2
        }, modes: {
            jayce: "cannon"
        }
    })
    const g = u(s,
        "B",
        "garen")
    g.maxHp = g.hp = 9000
    return s
}
const gate = (s: St) => u(s,
    "A",
    "jayce").stacks.jayce_gate ?? 0
test("Pháo E: chỉ Jayce nhận Gia Tốc, cộng dồn không trần, không hết hạn, mỗi Gia Tốc e5 Tốc Đánh",
    () => {
        let s = cannonBoard()
        const base = gm(s).attackSpeed(u(s,
            "A",
            "jayce"))
        for (let i = 0; i < 7; i++) s = cast(s,
            "A",
            skill(s,
                "jayce",
                "A",
                "E")).s
        assert.equal(gate(s),
            7)
        assert.equal(gm(s).attackSpeed(u(s,
            "A",
            "jayce")),
        base + 7 * p.e5)
        assert.equal(gm(s).statusV(u(s,
            "A",
            "soraka"),
        "attack_speed"),
        0,
        "ích kỉ, đồng minh không có")
        for (let i = 0; i < 6; i++) s = endTurn(s).s
        assert.equal(gate(s),
            7,
            "không hết hạn")
    })
test("Gia Tốc cộng e6 cho Q Pháo, e7 cho R Pháo",
    () => {
        const dealt = (key: "Q" | "R", n: number) => {
            const s = cannonBoard()
            u(s,
                "A",
                "jayce").stacks.jayce_gate = n
            return dmgOn(cast(s,
                "A",
                skill(s,
                    "jayce",
                    "A",
                    key),
                {
                    target: "B:garen"
                }).ev,
            "B:garen")
        }
        const armor = gm(cannonBoard()).armor(u(cannonBoard(),
            "B",
            "garen"))
        assert.ok(Math.abs(dealt("Q",
            10) - dealt("Q",
            0) - 10 * p.e6 * 100 / (100 + armor)) <= 1)
        assert.ok(dealt("R",
            10) > dealt("R",
            0))
    })
const flip = (s: St) => cg.getHero("jayce")!.abilities![0].resolve(gm(s),
    u(s,
        "A",
        "jayce"),
    {
    })
test("Búa giữ Gia Tốc nhưng không tính; về Pháo tính lại đủ",
    () => {
        const s = cannonBoard()
        const me = u(s,
            "A",
            "jayce")
        me.stacks.jayce_gate = 5
        const on = gm(s).attackSpeed(me)
        flip(s)
        assert.equal(me.stacks.jayce_form,
            0)
        assert.equal(me.stacks.jayce_gate,
            5)
        assert.equal(gm(s).attackSpeed(me),
            cg.RULES.baseAttackSpeed)
        me.stacks["once:jayce_swap"] = -1
        flip(s)
        assert.equal(gm(s).attackSpeed(me),
            on)
    })
test("Búa: Tốc Đánh và Chí Mạng từ đồ thành Máu, mỗi đòn trúng hồi p8 Máu tối đa",
    () => {
        const s = mk({
            A: {
                jayce: 2
            }, B: {
                garen: 2
            }, modes: {
                jayce: "hammer"
            }
        })
        const g = gm(s), me = u(s,
            "A",
            "jayce")
        const hp0 = me.maxHp, b = cg.itemBalance("cuong_dao").stats
        g.equip(me,
            "cuong_dao")
        assert.equal(g.attackSpeed(me),
            cg.RULES.baseAttackSpeed)
        assert.equal(g.stats(me).crit,
            0)
        assert.equal(me.maxHp,
            hp0 + Math.round(p.p3 * b.attackSpeed + p.p4 * 100 * (b.crit ?? 0)))
        me.hp = 100
        const r = basic(s,
            "A",
            "A:jayce",
            "B:garen")
        assert.equal(u(r.s,
            "A",
            "jayce").hp,
        100 + Math.round(u(r.s,
            "A",
            "jayce").maxHp * p.p8))
    })
test("Pháo: Máu, Giáp, Kháng phép từ đồ thành AD, chỉ số gốc giữ nguyên, đổi dạng cập nhật Máu tối đa",
    () => {
        const s = cannonBoard()
        const g = gm(s), me = u(s,
            "A",
            "jayce")
        const atk0 = g.atk(me), armor0 = g.armor(me), hp0 = me.maxHp
        g.equip(me,
            "ao_choang_gai")
        const b = cg.itemBalance("ao_choang_gai").stats
        assert.equal(g.armor(me),
            armor0)
        assert.equal(me.maxHp,
            hp0)
        assert.equal(g.atk(me),
            Math.round(atk0 + p.p6 * b.armor + p.p7 * (b.mr ?? 0)))
        flip(s)
        assert.equal(g.armor(me),
            armor0 + b.armor)
    })
test("Búa Q hồi q7% sát thương, E hồi e9 Máu đã mất, R hồi r9% tổng sát thương",
    () => {
        const board = () => {
            const s = mk({
                A: {
                    jayce: 2
                }, B: {
                    garen: 2, braum: 1
                }, modes: {
                    jayce: "hammer"
                }
            })
            for (const h of ["garen",
                "braum"]) { const x = u(s,
                "B",
                h); x.maxHp = x.hp = 9000 }
            u(s,
                "A",
                "jayce").hp = 100
            return s
        }
        const healed = (key: "Q" | "E" | "R", args = {
        }) => {
            const s = board()
            const r = cast(s,
                "A",
                skill(s,
                    "jayce",
                    "A",
                    key),
                args)
            return {
                dealt: dmgOn(r.ev,
                    "B:garen") + dmgOn(r.ev,
                    "B:braum"), gain: u(r.s,
                    "A",
                    "jayce").hp - 100, max: u(r.s,
                    "A",
                    "jayce").maxHp
            }
        }
        const q = healed("Q",
            {
                target: "B:garen"
            })
        assert.ok(Math.abs(q.gain - q.dealt * p.q7 / 100) <= 1)
        const e = healed("E")
        assert.ok(Math.abs(e.gain - (e.max - 100) * p.e9) <= 1)
        const r = healed("R")
        assert.ok(Math.abs(r.gain - r.dealt * p.r9 / 100) <= 1)
    })
test("Pháo không có đòn hồi Máu của Búa",
    () => {
        const s = cannonBoard()
        const me = u(s,
            "A",
            "jayce")
        me.hp = 100
        const r = basic(s,
            "A",
            "A:jayce",
            "B:garen")
        assert.equal(u(r.s,
            "A",
            "jayce").hp,
        100)
    })
test("Jayce bị hạ mất một nửa Gia Tốc, làm tròn xuống",
    () => {
        const s = cannonBoard()
        u(s,
            "A",
            "jayce").stacks.jayce_gate = 5
        gm(s).kill(u(s,
            "A",
            "jayce"))
        assert.equal(gate(s),
            2)
    })

G("Nút đổi dạng và Standby")
/** Trận thật tới đầu lượt A của Jayce: A hết lượt, B hết lượt */
function toStandby(s0: St) {
    s0.step = "main1"
    let s = act(s0,
        {
            t: "end", side: "A"
        }).s
    if (s.step === "standby") s = act(s,
        {
            t: "step", side: s.active
        }).s
    for (let i = 0; i < 40 && s.phase === "blind"; i++) {
        const side = cg.actorsOf(s)[0]
        const la = cg.legalActions(s,
            side)
        s = act(s,
            la.find((x) => x.t === "ready") ?? la[0]).s
    }
    s = act(s,
        {
            t: "end", side: "B"
        }).s
    for (let i = 0; i < 40 && s.phase === "blind"; i++) {
        const side = cg.actorsOf(s)[0]
        const la = cg.legalActions(s,
            side)
        s = act(s,
            la.find((x) => x.t === "ready") ?? la[0]).s
    }
    return s
}
const swapBtn = (s: St) => cg.legalActions(s,
    "A").some((a) => a.t === "ability" && a.id === "jayce_swap")
test("Standby dừng đúng khi có nút; nút không xuất hiện ngoài Standby",
    () => {
        const s = toStandby(hammer())
        assert.equal(s.active,
            "A")
        assert.equal(s.step,
            "standby")
        assert.ok(swapBtn(s),
            "nút ở Standby")
        assert.ok(!cg.legalActions(s,
            "A").some((a) => a.t === "end"),
        "Standby không kết thúc lượt được")
        const m = act(s,
            {
                t: "step", side: "A"
            }).s
        assert.equal(m.step,
            "main1")
        assert.ok(!swapBtn(m),
            "không có ở Main 1")
        const b = act(m,
            {
                t: "step", side: "A"
            }).s
        assert.equal(b.step,
            "battle")
        assert.ok(!swapBtn(b),
            "không có ở Battle")
        const m2 = act(b,
            {
                t: "step", side: "A"
            }).s
        assert.equal(m2.step,
            "main2")
        assert.ok(!swapBtn(m2),
            "không có ở Main 2")
    })
test("đổi dạng xong tự sang Main 1, 1 lần mỗi lượt, không tốn mana",
    () => {
        const s = toStandby(hammer())
        const m = s.teamMana!.A, handN = s.players.A.hand.length
        const r = act(s,
            {
                t: "ability", side: "A", unit: "A:jayce", id: "jayce_swap", args: {
                }
            })
        assert.equal(r.s.step,
            "main1")
        assert.equal(u(r.s,
            "A",
            "jayce").stacks.jayce_form,
        1)
        assert.equal(u(r.s,
            "A",
            "jayce").stacks.jayce_charge,
        1)
        assert.equal(r.s.teamMana!.A,
            m)
        assert.equal(r.s.players.A.hand.length,
            handN)
        assert.throws(() => act(r.s,
            {
                t: "ability", side: "A", unit: "A:jayce", id: "jayce_swap", args: {
                }
            }))
    })
test("Jayce bị Choáng thì Standby không dừng",
    () => {
        const s0 = hammer()
        gm(s0).status(u(s0,
            "A",
            "jayce"),
        "stun",
        4,
        {
            of: "A"
        })
        const s = toStandby(s0)
        assert.notEqual(s.step,
            "standby")
    })
test("bot Standby: Búa còn địch đối diện thì giữ dạng, không còn thì đổi sang Pháo",
    () => {
        const keep = toStandby(hammer())
        assert.equal(cg.chooseAction(keep,
            "A").t,
        "step")
        const s1 = hammer()
        const s = toStandby(s1)
        gm(s).kill(u(s,
            "B",
            "garen"))
        const a = cg.chooseAction(s,
            "A")
        assert.equal(a.t,
            "ability",
            "đối diện đã chết: đổi sang Pháo")
    })

G("R theo dạng")
test("Búa Sấm Chớp Rền Vang: đối diện r4%, 2 đường kề đủ, có r0 mana",
    () => {
        const s = hammer()
        const raw = gm(s).f(u(s,
            "A",
            "jayce"),
        kj.x("r1 + r2·AD + r3·Máu tối đa"))
        const m = s.teamMana!.A
        const r = cast(s,
            "A",
            skill(s,
                "jayce",
                "A",
                "R"))
        assert.equal(r.s.teamMana!.A,
            m - p.r0)
        assert.equal(dmgOn(r.ev,
            "B:garen"),
        mit(raw * p.r4 / 100,
            armorOf(s,
                "B",
                "garen")))
        assert.equal(dmgOn(r.ev,
            "B:teemo"),
        mit(raw,
            armorOf(s,
                "B",
                "teemo")))
    })
test("Pháo Tích Tụ: 1 địch bất kỳ đường theo Máu đã mất, xuyên r8 Giáp",
    () => {
        const s = cannon()
        u(s,
            "B",
            "zed").hp -= 1000
        const raw = gm(s).f(u(s,
            "A",
            "jayce"),
        kj.x("r5 + r6·AD + r7% máu đã mất mục tiêu"),
        u(s,
            "B",
            "zed"))
        const r = cast(s,
            "A",
            skill(s,
                "jayce",
                "A",
                "R"),
            {
                target: "B:zed"
            })
        assert.equal(dmgOn(r.ev,
            "B:zed"),
        mit(raw,
            Math.max(0,
                armorOf(s,
                    "B",
                    "zed") - p.r8)))
        assert.ok(cg.cardInfo(gm(s),
            skill(s,
                "jayce",
                "A",
                "R")).name.includes("Tích Tụ"))
    })

G("Cặp với Sylas, Mel, Azir")
function steal(s0: St, key: "Q" | "E" | "R"): { s: St; card: cg.Card } {
    const c = skill(s0,
        "sylas",
        "A",
        "R")
    s0.players.A.hand.push(c)
    const opt = (cg.legalActions(s0,
        "A").filter((a) => a.t === "play" && a.uid === c.uid) as PlayAct[]).find((a) => a.args?.pick === `steal:jayce:${key}`)
    assert.ok(opt,
        `không có Jayce ${key}`)
    const { s } = passAll(act(s0,
        opt).s)
    const card = s.players.A.hand.find((x) => x.id === `jayce_${key.toLowerCase()}` && x.data?.stolen)
    assert.ok(card)
    return {
        s, card
    }
}
const sylasBoard = (mode: string) => {
    const s = mk({
        A: {
            sylas: 2, soraka: 1
        }, B: {
            jayce: 3, garen: 2, braum: 1
        }, modes: {
            jayce: mode
        }
    })
    for (const h of ["jayce",
        "garen",
        "braum"]) tank(s,
        "B",
        h)
    return s
}
test("Sylas đoạt Q lấy bản Búa lúc đoạt: dù Jayce đổi dạng sau đó, Sylas vẫn nhảy",
    () => {
        const st = steal(sylasBoard("hammer"),
            "Q")
        assert.equal(st.card.data?.form,
            0)
        assert.ok(cg.cardInfo(gm(st.s),
            st.card).name.includes("Chỉ Thiên!"))
        u(st.s,
            "B",
            "jayce").stacks.jayce_form = 1
        const r = passAll(act(st.s,
            {
                t: "play", side: "A", uid: st.card.uid, args: {
                    target: "B:jayce"
                }
            }).s)
        assert.equal(u(r.s,
            "A",
            "sylas").lane,
        3,
        "Sylas hoán đổi")
    })
test("Sylas đoạt Q, E bản Pháo: không dời, AD đổi từ AP, tên theo Pháo",
    () => {
        const st = steal(sylasBoard("cannon"),
            "Q")
        assert.equal(st.card.data?.form,
            1)
        assert.ok(cg.cardInfo(gm(st.s),
            st.card).name.includes("Cầu Sấm"))
        const r0 = act(st.s,
            {
                t: "play", side: "A", uid: st.card.uid, args: {
                    target: "B:jayce"
                }
            })
        const r = passAll(r0.s,
            r0.ev)
        assert.equal(u(r.s,
            "A",
            "sylas").lane,
        2)
        assert.ok(dmgOn(r.ev,
            "B:jayce") > 0)
        const e = steal(sylasBoard("cannon"),
            "E")
        const d = passAll(act(e.s,
            {
                t: "play", side: "A", uid: e.card.uid, args: {
                }
            }).s)
        assert.equal(gm(d.s).statusV(u(d.s,
            "A",
            "sylas"),
        "attack_speed"),
        p.e5)
    })
test("Sylas đoạt R theo dạng lúc đoạt",
    () => {
        const c = sylasBoard("cannon")
        const st = steal(c,
            "R")
        assert.equal(st.card.data?.form,
            1)
        assert.ok(cg.cardInfo(gm(st.s),
            st.card).name.includes("Tích Tụ"))
        const r0 = act(st.s,
            {
                t: "play", side: "A", uid: st.card.uid, args: {
                    target: "B:garen"
                }
            })
        const r = passAll(r0.s,
            r0.ev)
        assert.ok(dmgOn(r.ev,
            "B:garen") > 0)
        const h = steal(sylasBoard("hammer"),
            "R")
        assert.equal(h.card.data?.form,
            0)
        assert.ok(cg.cardInfo(gm(h.s),
            h.card).name.includes("Sấm Chớp Rền Vang"))
    })
test("Mel E phản Chỉ Thiên!: đổi chỗ không phản, Jayce vẫn dời, nhận lại sát thương",
    () => {
        const s = mk({
            A: {
                jayce: 2
            }, B: {
                mel: 3, garen: 1
            }, modes: {
                jayce: "hammer"
            }
        })
        tank(s,
            "B",
            "garen")
        s.players.B.hand.push(skill(s,
            "mel",
            "B",
            "E"))
        const open = cast(s,
            "A",
            skill(s,
                "jayce",
                "A",
                "Q"),
            {
                target: "B:garen"
            },
            false)
        const opt = cg.legalActions(open.s,
            "B").filter((a) => a.t === "chain") as ChainAct[]
        assert.equal(opt.length,
            1)
        const r0 = act(open.s,
            opt[0])
        const r = passAll(r0.s,
            r0.ev)
        assert.equal(u(r.s,
            "A",
            "jayce").lane,
        1,
        "Jayce đã đổi chỗ, Mel E không chặn")
        assert.ok(dmgOn(r.ev,
            "A:jayce") > 0,
        "Jayce nhận lại")
        assert.ok(!u(r.s,
            "A",
            "jayce").statuses.stun,
        "chiêu không có khống chế thì không có gì để phản")
    })
test("Mel E nối được Búa E vì Búa E nhắm đúng địch đối diện; Pháo E thì không",
    () => {
        const s = hammer({
            mel: 2
        })
        s.players.B.hand.push(skill(s,
            "mel",
            "B",
            "E"))
        const open = cast(s,
            "A",
            skill(s,
                "jayce",
                "A",
                "E"),
            {
            },
            false)
        assert.equal(cg.legalActions(open.s,
            "B").filter((a) => a.t === "chain").length,
        1)
        const c = cannon({
            mel: 2
        })
        c.players.B.hand.push(skill(c,
            "mel",
            "B",
            "E"))
        const o2 = cast(c,
            "A",
            skill(c,
                "jayce",
                "A",
                "E"),
            {
            },
            false)
        assert.equal(o2.s.phase === "chain" ? cg.legalActions(o2.s,
            "B").filter((a) => a.t === "chain").length : 0,
        0)
    })
report()
