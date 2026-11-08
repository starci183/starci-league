// Test bộ chiêu Sylas (R Đoạt Chiêu dùng lại cơ chế Lá Tái Chế). Chạy: npx tsx scripts/card_tests_kits_sylas.ts [--only=đoạt] [--verbose]
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
const ks = cg.kit("sylas"), kp = ks.p
const mit = (raw: number, def: number) => Math.round(raw * 100 / (100 + def))
const mr = (s: St, side: S, h: string) => gm(s).mr(u(s,
    side,
    h))
const armorOf = (s: St, side: S, h: string) => gm(s).armor(u(s,
    side,
    h))
const boost = (s: St, side: S, hero: string, ap: number) => gm(s).status(u(s,
    side,
    hero),
"ap_up",
30,
{
    v: ap, of: side
})
const tank = (s: St, side: S, hero: string) => { const x = u(s,
    side,
    hero); x.maxHp = x.hp = 9000 }
const val = (s: St, expr: string) => gm(s).f(u(s,
    "A",
    "sylas"),
expr)

type PlayAct = Extract<Act, { t: "play" }>
type ChainAct = Extract<Act, { t: "chain" }>
/** Mọi lựa chọn R của lá R đang trên tay A */
function rOptions(s: St): PlayAct[] {
    if (!s.players.A.hand.some((c) => c.id === "sylas_r")) s.players.A.hand.push(skill(s,
        "sylas",
        "A",
        "R"))
    return (cg.legalActions(s,
        "A").filter((a) => a.t === "play") as PlayAct[]).filter((a) => s.players.A.hand.find((c) => c.uid === a.uid)?.id === "sylas_r")
}
const picksOf = (s: St, hero: string) => rOptions(s).filter((a) => a.args?.target === `B:${hero}`).map((a) => a.args?.pick ?? "")
const hasPick = (s: St, hero: string, key: string) => picksOf(s,
    hero).some((p) => p.endsWith(`:${key}`))
/** Sylas dùng R đoạt `key` của `hero` bên B; trả state và lá Chiêu Đoạt trên tay */
function steal(s0: St, hero: string, key: "Q" | "E" | "R"): { s: St; card: cg.Card } {
    const opt = rOptions(s0).find((a) => a.args?.target === `B:${hero}` && a.args?.pick?.endsWith(`:${key}`))
    assert.ok(opt,
        `không có lựa chọn ${hero} ${key}`)
    let r = act(s0,
        opt)
    while (r.s.phase === "chain" && r.s.chain) r = act(r.s,
        {
            t: "pass", side: r.s.chain.priority
        })
    const card = r.s.players.A.hand.find((c) => c.id === `${hero}_${key.toLowerCase()}` && c.data?.stolen)
    assert.ok(card,
        "Chiêu Đoạt lên tay")
    return {
        s: r.s, card
    }
}
/** Đánh lá đã có trên tay */
function play(s0: St, card: cg.Card, args: cg.PlayArgs = {
}) {
    let r = act(s0,
        {
            t: "play", side: "A", uid: card.uid, args
        })
    const ev: Ev = [...r.ev]
    while (r.s.phase === "chain" && r.s.chain) {
        r = act(r.s,
            {
                t: "pass", side: r.s.chain.priority
            })
        ev.push(...r.ev)
    }
    return {
        s: r.s, ev
    }
}
const legalPlays = (s: St, card: cg.Card) => (cg.legalActions(s,
    "A").filter((a) => a.t === "play" && a.uid === card.uid) as PlayAct[])

G("Sylas nội tại")
test("mỗi lá chiêu cho 1 Xiềng Nổ, tối đa p1; đòn thường gây phép",
    () => {
        let s = mk({
            A: {
                sylas: 2, braum: 1
            }, B: {
                garen: 2
            }
        })
        tank(s,
            "B",
            "garen")
        for (let i = 0; i < kp.p1 + 2; i++) s = cast(s,
            "A",
            skill(s,
                "sylas",
                "A",
                "Q"),
            {
                target: "A:braum"
            }).s
        assert.equal(u(s,
            "A",
            "sylas").stacks.sylas_shackle,
        kp.p1)
        assert.equal(cg.getHero("sylas")?.damage,
            "magic")
    })
test("đòn đánh tiêu 1 Xiềng Nổ: thêm p2 + p3·AP phép lên mục tiêu và 2 đường kề",
    () => {
        const s = mk({
            A: {
                sylas: 2
            }, B: {
                garen: 2, braum: 1, zed: 3
            }
        })
        for (const h of ["garen",
            "braum",
            "zed"]) tank(s,
            "B",
            h)
        boost(s,
            "A",
            "sylas",
            100)
        gm(s).setStack(u(s,
            "A",
            "sylas"),
        "sylas_shackle",
        2)
        const burst = val(s,
            ks.x("p2 + p3·AP"))
        const r = basic(s,
            "A",
            "A:sylas",
            "B:garen")
        assert.equal(u(r.s,
            "A",
            "sylas").stacks.sylas_shackle,
        1)
        assert.equal(dmgOn(r.ev,
            "B:braum"),
        mit(burst,
            mr(s,
                "B",
                "braum")))
        assert.equal(dmgOn(r.ev,
            "B:zed"),
        mit(burst,
            mr(s,
                "B",
                "zed")))
        assert.ok(r.ev.some((e) => e.t === "damage" && e.target === "B:garen" && e.kind === "magic" && e.tag === "attack"),
            "đòn thường gây phép")
    })
test("không có Xiềng Nổ: đòn đánh không nổ lan",
    () => {
        const s = mk({
            A: {
                sylas: 2
            }, B: {
                garen: 2, braum: 1
            }
        })
        tank(s,
            "B",
            "garen")
        const r = basic(s,
            "A",
            "A:sylas",
            "B:garen")
        assert.equal(dmgOn(r.ev,
            "B:braum"),
        0)
    })
test("Sylas bị hạ: mất một nửa Xiềng Nổ",
    () => {
        const s = mk({
            A: {
                sylas: 2
            }, B: {
                garen: 2
            }
        })
        const me = u(s,
            "A",
            "sylas")
        gm(s).setStack(me,
            "sylas_shackle",
            3)
        const g = gm(s)
        g.kill(me,
            u(s,
                "B",
                "garen"))
        assert.equal(me.stacks.sylas_shackle,
            1)
    })

G("Sylas Q, E")
test("Q: đổi chỗ với đồng minh rồi đánh tướng địch ngay trước mặt (nhân q3%), đường khác không dính",
    () => {
        const s = mk({
            A: {
                sylas: 2, braum: 0
            }, B: {
                garen: 2, zed: 0, teemo: 1
            }
        })
        for (const h of ["garen",
            "zed",
            "teemo"]) tank(s,
            "B",
            h)
        boost(s,
            "A",
            "sylas",
            100)
        const raw = val(s,
            ks.x("q1 + q2·AP"))
        const r = cast(s,
            "A",
            skill(s,
                "sylas",
                "A",
                "Q"),
            {
                target: "A:braum"
            })
        assert.equal(u(r.s,
            "A",
            "sylas").lane,
        0,
        "Sylas sang đường của đồng minh")
        assert.equal(u(r.s,
            "A",
            "braum").lane,
        2,
        "đồng minh về đường cũ của Sylas")
        assert.equal(dmgOn(r.ev,
            "B:zed"),
        mit(raw * kp.q3 / 100,
            mr(s,
                "B",
                "zed")),
        "đánh tướng địch trước mặt vị trí mới")
        for (const h of ["garen",
            "teemo"]) assert.equal(dmgOn(r.ev,
            `B:${h}`),
        0,
        `${h} không ở trước mặt nên không trúng`)
    })
test("E: gây phép, hồi e3 + e4·AP cộng e5% Máu đã mất",
    () => {
        const s = mk({
            A: {
                sylas: 2
            }, B: {
                garen: 2, zed: 3
            }
        })
        tank(s,
            "B",
            "zed")
        boost(s,
            "A",
            "sylas",
            50)
        const me = u(s,
            "A",
            "sylas")
        me.hp = me.maxHp - 200
        const heal = Math.round(val(s,
            ks.x("e3 + e4·AP + e5% máu đã mất")))
        assert.equal(heal,
            Math.round(kp.e3 + kp.e4 * 50 + kp.e5 / 100 * 200))
        const r = cast(s,
            "A",
            skill(s,
                "sylas",
                "A",
                "E"),
            {
                target: "B:zed"
            })
        assert.equal(u(r.s,
            "A",
            "sylas").hp,
        me.hp + heal)
        assert.equal(dmgOn(r.ev,
            "B:zed"),
        mit(val(s,
            ks.x("e1 + e2·AP")),
        mr(s,
            "B",
            "zed")))
    })
test("E Quick: nối khi địch nhắm đúng Sylas, mục tiêu khoá là kẻ đó",
    () => {
        const s = mk({
            A: {
                sylas: 2
            }, B: {
                ahri: 2
            }
        })
        s.active = "B"
        s.players.A.hand.push(skill(s,
            "sylas",
            "A",
            "E"))
        const r = cast(s,
            "B",
            skill(s,
                "ahri",
                "B",
                "R"),
            {
            },
            false)
        const opts = cg.legalActions(r.s,
            "A").filter((a) => a.t === "chain") as ChainAct[]
        assert.equal(opts.length,
            1)
        assert.equal(opts[0].args?.target,
            "B:ahri")
    })

G("Sylas R Đoạt Chiêu")
test("lựa chọn đi qua args.pick: mỗi địch × Q, E, R, nhãn đọc được, mục tiêu đúng",
    () => {
        const s = mk({
            A: {
                sylas: 2
            }, B: {
                garen: 2, leona: 1
            }
        })
        const picks = picksOf(s,
            "garen")
        assert.equal(picks.length,
            3)
        assert.ok(picks[0] === "steal:garen:Q",
            picks[0])
        assert.equal(new Set(rOptions(s).map((a) => a.args?.pick)).size,
            rOptions(s).length,
            "mỗi lựa chọn một nhãn riêng")
    })
test("không gọi được khi hết địch chọn được; chọn sai pick thì không có Chiêu Đoạt",
    () => {
        const s = mk({
            A: {
                sylas: 2
            }, B: {
                garen: 2
            }
        })
        const c = skill(s,
            "sylas",
            "A",
            "R")
        s.players.A.hand.push(c)
        assert.throws(() => act(s,
            {
                t: "play", side: "A", uid: c.uid, args: {
                    target: "B:garen", pick: "khong_co"
                }
            }))
    })
test("tốn r0 mana rồi Chiêu Đoạt trả đúng mana gốc",
    () => {
        let s = mk({
            A: {
                sylas: 2
            }, B: {
                garen: 2
            }
        })
        tank(s,
            "B",
            "garen")
        const before = s.teamMana!.A
        const st = steal(s,
            "garen",
            "R")
        s = st.s
        assert.equal(s.teamMana!.A,
            before - kp.r0)
        const m = s.teamMana!.A
        s = play(s,
            st.card,
            {
                target: "B:garen"
            }).s
        assert.equal(s.teamMana!.A,
            m - cg.kit("garen").p.r0)
    })
test("Chiêu Đoạt: lá tạm, keepCC từ JSON, apPerAd = p4, không tính tay, mô tả ghi rõ",
    () => {
        const s = mk({
            A: {
                sylas: 2
            }, B: {
                garen: 2
            }
        })
        const st = steal(s,
            "garen",
            "Q")
        assert.equal(st.card.temp,
            true)
        assert.equal(st.card.data?.apPerAd,
            kp.p4)
        assert.equal(st.card.data?.keepCC,
            ks.num("keepCC"))
        const info = cg.cardInfo(gm(st.s),
            st.card)
        assert.ok(info.name.startsWith("Chiêu Đoạt: Garen"),
            info.name)
        assert.ok(cg.cardInfo(gm(st.s),
            st.card,
            undefined,
            "en").name.startsWith("Hijacked: Garen"))
    })
test("AD đổi thành AP theo p4 trên Darius Q (hệ số Máu giữ nguyên, tính theo Sylas)",
    () => {
        const s0 = mk({
            A: {
                sylas: 2
            }, B: {
                darius: 2
            }
        })
        tank(s0,
            "B",
            "darius")
        boost(s0,
            "A",
            "sylas",
            90)
        const kd = cg.kit("darius")
        const st = steal(s0,
            "darius",
            "Q")
        const me = u(st.s,
            "A",
            "sylas")
        const raw = kd.p.q1 + kd.p.q2 * Math.round(90 / kp.p4) + kd.p.q3 * me.maxHp
        const r = play(st.s,
            st.card)
        assert.equal(dmgOn(r.ev,
            "B:darius"),
        mit(raw,
            armorOf(s0,
                "B",
                "darius")))
    })
test("AD đổi thành AP trên Garen Q, E, R; Khiên theo Máu tối đa của Sylas; Câm Lặng giữ",
    () => {
        const kg = cg.kit("garen")
        const setup = () => {
            const s = mk({
                A: {
                    sylas: 2
                }, B: {
                    garen: 2
                }
            })
            tank(s,
                "B",
                "garen")
            boost(s,
                "A",
                "sylas",
                100)
            return s
        }
        const ad = Math.round(100 / kp.p4)
        let st = steal(setup(),
            "garen",
            "Q")
        let r = play(st.s,
            st.card)
        assert.equal(dmgOn(r.ev,
            "B:garen"),
        mit(kg.p.q1 + kg.p.q2 * ad,
            armorOf(st.s,
                "B",
                "garen")))
        assert.ok(u(r.s,
            "B",
            "garen").statuses.silence,
        "Câm Lặng giữ nguyên")
        st = steal(setup(),
            "garen",
            "E")
        const shield = u(st.s,
            "A",
            "sylas").maxHp * kg.p.e2 + kg.p.e1
        r = play(st.s,
            st.card)
        assert.equal(dmgOn(r.ev,
            "B:garen"),
        mit(kg.p.e3 + kg.p.e4 * ad,
            armorOf(st.s,
                "B",
                "garen")))
        assert.equal(gm(r.s).totalShield(u(r.s,
            "A",
            "sylas")),
        Math.round(shield))
        st = steal(setup(),
            "garen",
            "R")
        r = play(st.s,
            st.card,
            {
                target: "B:garen"
            })
        assert.equal(dmgOn(r.ev,
            "B:garen"),
        Math.round(kg.p.r1 + kg.p.r2 * ad),
        "chuẩn, không giảm")
    })
test("copied Stun: Choáng của lá gốc giữ nguyên (khác Rumble)",
    () => {
        const s0 = mk({
            A: {
                sylas: 2
            }, B: {
                leona: 2
            }
        })
        tank(s0,
            "B",
            "leona")
        gm(s0).status(u(s0,
            "A",
            "sylas"),
        "armor_up",
        30,
        {
            v: 800, of: "A"
        })
        const st = steal(s0,
            "leona",
            "Q")
        const r = play(st.s,
            st.card)
        assert.ok(u(r.s,
            "B",
            "leona").statuses.stun,
        "Choáng")
    })
test("Quick copy nối được Chuỗi: Lux Q đoạt, địch nhắm đúng Sylas",
    () => {
        const s0 = mk({
            A: {
                sylas: 2
            }, B: {
                lux: 2, ahri: 1
            }
        })
        tank(s0,
            "B",
            "lux")
        const st = steal(s0,
            "lux",
            "Q")
        const after = endTurn(st.s).s
        assert.equal(after.active,
            "B")
        assert.ok(after.players.A.hand.some((c) => c.uid === st.card.uid),
            "lá sống qua lượt địch")
        const r = cast(after,
            "B",
            skill(after,
                "lux",
                "B",
                "E"),
            {
                target: "A:sylas"
            },
            false)
        const opt = (cg.legalActions(r.s,
            "A").filter((a) => a.t === "chain") as ChainAct[]).find((a) => a.uid === st.card.uid)
        assert.ok(opt,
            "Chiêu Đoạt Quick nằm trong lựa chọn Chuỗi")
    })
test("Quick mất điều kiện: Garen E đoạt không nối khi địch nhắm tướng khác",
    () => {
        const s0 = mk({
            A: {
                sylas: 2, soraka: 1
            }, B: {
                garen: 2, ahri: 1
            }
        })
        const st = steal(s0,
            "garen",
            "E")
        const after = endTurn(st.s).s
        const r = cast(after,
            "B",
            skill(after,
                "ahri",
                "B",
                "E"),
            {
                target: "B:garen"
            },
            false)
        if (r.s.phase === "chain") assert.ok(!(cg.legalActions(r.s,
            "A").filter((a) => a.t === "chain") as ChainAct[]).some((a) => a.uid === st.card.uid))
    })
test("copy skill có pick: Twisted Fate E chọn lá đưa lên đỉnh",
    () => {
        const s0 = mk({
            A: {
                sylas: 2
            }, B: {
                twistedfate: 2
            }
        })
        tank(s0,
            "B",
            "twistedfate")
        const st = steal(s0,
            "twistedfate",
            "E")
        const third = st.s.players.A.deck[2]
        const opt = legalPlays(st.s,
            st.card).find((a) => a.args?.pick === third.uid)
        assert.ok(opt,
            "lá thứ 3 nằm trong lựa chọn")
        const r = play(st.s,
            st.card,
            opt.args)
        assert.equal(r.s.players.A.deck[0].uid,
            third.uid)
    })
test("copy skill có discard: Viktor Q bỏ lá theo tay phe Sylas",
    () => {
        const s0 = mk({
            A: {
                sylas: 2
            }, B: {
                viktor: 2
            }
        })
        tank(s0,
            "B",
            "viktor")
        const st = steal(s0,
            "viktor",
            "Q")
        const extra = sup(st.s,
            "gold")
        st.s.players.A.hand.push(extra)
        const opt = legalPlays(st.s,
            st.card).find((a) => a.args?.discard?.[0] === extra.uid)
        assert.ok(opt)
        const r = play(st.s,
            st.card,
            opt.args)
        assert.ok(!r.s.players.A.hand.some((c) => c.uid === extra.uid))
    })
test("copy skill gọi token: Annie R gọi Tibbers cho Sylas, Sylas chết thì Tibbers biến mất",
    () => {
        const s0 = mk({
            A: {
                sylas: 2
            }, B: {
                annie: 2
            }
        })
        tank(s0,
            "B",
            "annie")
        const st = steal(s0,
            "annie",
            "R")
        const r = play(st.s,
            st.card)
        const tok = gm(r.s).tokenOf("A")
        assert.equal(tok?.token?.ownerId,
            "A:sylas")
        gm(r.s).kill(u(r.s,
            "A",
            "sylas"))
        assert.equal(gm(r.s).tokenOf("A"),
            undefined)
    })
test("copy skill gọi token: Yorick R, Ma Sương đánh đầu lượt phe Sylas",
    () => {
        const s0 = mk({
            A: {
                sylas: 2
            }, B: {
                yorick: 2
            }
        })
        tank(s0,
            "B",
            "yorick")
        const st = steal(s0,
            "yorick",
            "R")
        const r = play(st.s,
            st.card)
        assert.equal(gm(r.s).tokenOf("A")?.token?.ownerId,
            "A:sylas")
        let s = endTurn(r.s).s
        const e = endTurn(s)
        s = e.s
        assert.ok(dmgOn(e.ev,
            "B:yorick") > 0,
        "Ma Sương đánh đối diện")
    })
test("card expires: hết lượt đối phương thì Chiêu Đoạt biến mất, không vào mộ",
    () => {
        const s0 = mk({
            A: {
                sylas: 2
            }, B: {
                garen: 2
            }
        })
        const st = steal(s0,
            "garen",
            "Q")
        let s = endTurn(st.s).s
        assert.ok(s.players.A.hand.some((c) => c.uid === st.card.uid),
            "còn sau lượt mình")
        const r = endTurn(s)
        s = r.s
        assert.ok(!s.players.A.hand.some((c) => c.uid === st.card.uid),
            "hết sau lượt đối phương")
        assert.ok(!s.players.A.grave.some((c) => c.uid === st.card.uid))
        assert.ok(r.ev.some((e) => e.t === "tempExpired"))
    })
test("dùng xong biến mất, không vào mộ; toHand của lá gốc không có tác dụng (Annie Q hạ gục)",
    () => {
        const s0 = mk({
            A: {
                sylas: 2
            }, B: {
                annie: 2
            }
        })
        const st = steal(s0,
            "annie",
            "Q")
        u(st.s,
            "B",
            "annie").hp = 1
        const r = play(st.s,
            st.card,
            {
                target: "B:annie"
            })
        assert.equal(u(r.s,
            "B",
            "annie").status,
        "dead")
        assert.ok(!r.s.players.A.hand.some((c) => c.id === "annie_q"))
        assert.ok(!r.s.players.A.grave.some((c) => c.id === "annie_q"))
    })
test("Câm Lặng/Choáng: không đánh được; mắt xích đang chờ bị huỷ",
    () => {
        const s0 = mk({
            A: {
                sylas: 2
            }, B: {
                garen: 2, leona: 1
            }
        })
        tank(s0,
            "B",
            "garen")
        const st = steal(s0,
            "garen",
            "Q")
        for (const id of ["silence",
            "stun"]) {
            const s = structuredClone(st.s)
            gm(s).status(u(s,
                "A",
                "sylas"),
            id,
            1,
            {
                of: "A"
            })
            assert.equal(legalPlays(s,
                st.card).length,
            0,
            id)
        }
        // Câm Lặng giữa Chuỗi: Leona E choáng Sylas khi lá đang chờ giải quyết
        const s = structuredClone(st.s)
        gm(s).status(u(s,
            "A",
            "sylas"),
        "armor_up",
        30,
        {
            v: 1, of: "A"
        })
        const lc = skill(s,
            "leona",
            "B",
            "E")
        s.players.B.hand.push(lc)
        const opened = act(s,
            {
                t: "play", side: "A", uid: st.card.uid, args: {
                }
            })
        assert.equal(opened.s.phase,
            "chain")
        const link = (cg.legalActions(opened.s,
            "B").filter((a) => a.t === "chain") as ChainAct[]).find((a) => a.args?.target === "A:sylas")
        assert.ok(link)
        let r = act(opened.s,
            link)
        const ev = [...r.ev]
        // chắc chắn Choáng khi mắt xích Leona đã nối xong, trước khi Chuỗi giải quyết
        gm(r.s).status(u(r.s,
            "A",
            "sylas"),
        "stun",
        1,
        {
            of: "A"
        })
        while (r.s.phase === "chain" && r.s.chain) {
            r = act(r.s,
                {
                    t: "pass", side: r.s.chain.priority
                })
            ev.push(...r.ev)
        }
        assert.ok(ev.some((e) => e.t === "chainCancel"),
            "mắt xích Chiêu Đoạt bị huỷ")
        assert.equal(dmgOn(ev,
            "B:garen"),
        0)
        assert.ok(!r.s.players.A.grave.some((c) => c.uid === st.card.uid),
            "lá không vào mộ")
    })
test("Sylas chết khi còn Chiêu Đoạt: lá không đánh được, hết hạn như thường",
    () => {
        const s0 = mk({
            A: {
                sylas: 2
            }, B: {
                garen: 2
            }
        })
        const st = steal(s0,
            "garen",
            "Q")
        gm(st.s).kill(u(st.s,
            "A",
            "sylas"),
        u(st.s,
            "B",
            "garen"))
        assert.ok(st.s.players.A.hand.some((c) => c.uid === st.card.uid),
            "lá còn trên tay")
        assert.equal(legalPlays(st.s,
            st.card).length,
        0)
        let s = endTurn(st.s).s
        s = endTurn(s).s
        assert.ok(!s.players.A.hand.some((c) => c.uid === st.card.uid))
    })
test("Rumble R: Sylas đoạt dùng thì gây sát thương theo AP, không sinh lá Tái Chế",
    () => {
        const s0 = mk({
            A: {
                sylas: 2
            }, B: {
                rumble: 2
            }
        })
        tank(s0,
            "B",
            "rumble")
        s0.players.A.grave.push(skill(s0,
            "darius",
            "A",
            "Q"))
        const st = steal(s0,
            "rumble",
            "R")
        const r = play(st.s,
            st.card)
        assert.ok(dmgOn(r.ev,
            "B:rumble") > 0)
        assert.ok(!r.s.players.A.hand.some((c) => c.data?.recycled),
            "R không còn tái chế")
    })
test("Gangplank: R và E không hiện (cần Thùng của chủ), Q hiện và không sinh lá Gangplank",
    () => {
        const s0 = mk({
            A: {
                sylas: 2
            }, B: {
                gangplank: 2
            }
        })
        assert.equal(hasPick(s0,
            "gangplank",
            "R"),
        false)
        assert.equal(hasPick(s0,
            "gangplank",
            "E"),
        false)
        const st = steal(s0,
            "gangplank",
            "Q")
        u(st.s,
            "A",
            "sylas").hp -= 100
        const r = play(st.s,
            st.card)
        assert.ok(u(r.s,
            "A",
            "sylas").statuses.armor_up)
        assert.ok(!r.s.players.A.hand.some((c) => c.hero === "gangplank"))
    })
test("Zed R: Dấu Ấn nổ cuối lượt dù hook nằm ở Zed, kể cả Sylas đã chết; lá không vào mộ",
    () => {
        const kz = cg.kit("zed")
        const s0 = mk({
            A: {
                sylas: 2
            }, B: {
                zed: 2
            }
        })
        tank(s0,
            "B",
            "zed")
        const st = steal(s0,
            "zed",
            "R")
        const r = play(st.s,
            st.card)
        assert.ok(u(r.s,
            "B",
            "zed").statuses.zed_mark ?? Object.keys(u(r.s,
            "B",
            "zed").statuses).length,
        "có Dấu Ấn")
        const lost = u(r.s,
            "B",
            "zed").maxHp - u(r.s,
            "B",
            "zed").hp
        const e = endTurn(r.s)
        assert.equal(dmgOn(e.ev,
            "B:zed"),
        Math.round(kz.p.r3 + kz.p.r4 / 100 * lost),
        "sát thương chuẩn cuối lượt")
        assert.ok(!e.s.players.A.grave.some((c) => c.id === "zed_r"))
    })
test("Vel'Koz E: Sylas đoạt dùng thì khe nổ ngay, đánh hai cú",
    () => {
        const s0 = mk({
            A: {
                sylas: 2
            }, B: {
                velkoz: 2
            }
        })
        tank(s0,
            "B",
            "velkoz")
        const st = steal(s0,
            "velkoz",
            "E")
        const r = play(st.s,
            st.card,
            {
                target: "B:velkoz"
            })
        assert.equal(r.ev.filter((e) => e.t === "damage" && e.target === "B:velkoz" && e.kind === "magic").length,
            2)
    })
test("Darius R: chỉ hiện khi địch có Chảy Máu; không hạ thì không về tay",
    () => {
        const s0 = mk({
            A: {
                sylas: 2
            }, B: {
                darius: 2
            }
        })
        tank(s0,
            "B",
            "darius")
        assert.equal(hasPick(s0,
            "darius",
            "R"),
        false,
        "chưa có dấu")
        const q = steal(s0,
            "darius",
            "Q")
        const s1 = play(q.s,
            q.card).s
        const st = steal(s1,
            "darius",
            "R")
        let r = play(st.s,
            st.card,
            {
                target: "B:darius"
            })
        assert.ok(dmgOn(r.ev,
            "B:darius") > 0)
        for (let i = 0; i < 8; i++) r = endTurn(r.s)
        assert.ok(!r.s.players.A.hand.some((c) => c.id === "darius_r"),
            "không có lá Darius R về tay")
    })
test("Katarina R, Ashe Q, Tristana Q/E, Vayne R, Jinx Q, Kog'Maw E, Kha'Zix R không hiện",
    () => {
        const s = mk({
            A: {
                sylas: 2
            }, B: {
                katarina: 0, ashe: 1, tristana: 2, vayne: 3, jinx: 4
            }, modes: {
                jinx: "minigun"
            }
        })
        assert.equal(hasPick(s,
            "katarina",
            "R"),
        false)
        assert.equal(hasPick(s,
            "ashe",
            "Q"),
        false)
        assert.equal(hasPick(s,
            "tristana",
            "Q"),
        false)
        assert.equal(hasPick(s,
            "tristana",
            "E"),
        false)
        assert.equal(hasPick(s,
            "vayne",
            "R"),
        false)
        assert.equal(hasPick(s,
            "jinx",
            "Q"),
        false)
        const s2 = mk({
            A: {
                sylas: 2
            }, B: {
                kogmaw: 1, khazix: 2
            }
        })
        assert.equal(hasPick(s2,
            "kogmaw",
            "E"),
        false)
        assert.equal(hasPick(s2,
            "khazix",
            "R"),
        false)
    })
test("Sylas gương: không đoạt R của Sylas địch",
    () => {
        const s = mk({
            A: {
                sylas: 2, braum: 1
            }, B: {
                sylas: 2
            }
        })
        assert.equal(hasPick(s,
            "sylas",
            "R"),
        false)
        assert.equal(hasPick(s,
            "sylas",
            "Q"),
        true)
    })
test("mọi chiêu đoạt được của 35 tướng còn lại: tung được, không lỗi, không để lại lá của tướng khác",
    () => {
        const heroes = cg.implementedHeroes().map((h) => h.id).filter((h) => h !== "sylas")
        let n = 0
        const noArgs: string[] = []
        for (const hero of heroes) {
            for (const key of ["Q",
                "E",
                "R"] as const) {
                const s0 = mk({
                    A: {
                        sylas: 2, soraka: 1, garen: 3
                    }, B: {
                        [hero]: 2
                    }, modes: {
                        jinx: "minigun"
                    }
                })
                tank(s0,
                    "B",
                    hero)
                s0.players.B.hand = [sup(s0,
                    "gold")]
                if (!hasPick(s0,
                    hero,
                    key)) continue
                const st = steal(s0,
                    hero,
                    key)
                const opts = legalPlays(st.s,
                    st.card)
                const def = cg.getHero(hero)!.skills[key]!
                if (def.chainOnly) { n++; continue }
                if (!opts.length) { noArgs.push(`${hero}_${key}`); continue }
                const r = play(st.s,
                    st.card,
                    opts[0].args)
                assert.ok(!r.s.players.A.hand.some((c) => c.kind === "skill" && !["sylas",
                    "soraka",
                    "garen"].includes(c.hero ?? "")),
                `${hero} ${key} để lại lá lạ`)
                endTurn(r.s)
                n++
            }
        }
        assert.ok(n > 80,
            `tung được ${n} chiêu`)
        assert.deepEqual(noArgs,
            [],
            "chiêu được hiện mà không tung được")
    })

test("luật đang dùng: Sylas chỉ đoạt được R",
    () => {
        const s = mk({
            A: {
                sylas: 2
            }, B: {
                garen: 2
            }
        })
        const flags = cg.kit("sylas").raw.flags
        flags.stealOnlyR = true
        const c = skill(s,
            "sylas",
            "A",
            "R")
        s.players.A.hand.push(c)
        const picks = cg.legalActions(s,
            "A").flatMap((a) => (a.t === "play" && a.uid === c.uid && a.args?.pick ? [a.args.pick] : []))
        flags.stealOnlyR = false
        assert.deepEqual(picks,
            ["steal:garen:R"])
    })

report()
