// Test bộ chiêu Mel và cặp tương tác với Sylas. Chạy: npx tsx scripts/card_tests_kits_mel.ts [--only=ngưỡng] [--verbose]
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
const km = cg.kit("mel"), p = km.p
const E4 = p.e4
p.e4 = 100 // các test thời lượng cũ tính theo 100%, test riêng dưới đây đặt lại tỉ lệ
const GLOW = "mel_glow"
const mit = (raw: number, def: number) => Math.round(raw * 100 / (100 + def))
const mr = (s: St, side: S, h: string) => gm(s).mr(u(s,
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
const glow = (s: St, side: S, hero: string, n: number) => gm(s).setStack(u(s,
    side,
    hero),
GLOW,
n)
const glowOf = (s: St, side: S, hero: string) => u(s,
    side,
    hero).stacks[GLOW] ?? 0
const line = (n: number) => p.p3 + p.p4 * n

type ChainAct = Extract<Act, { t: "chain" }>
type PlayAct = Extract<Act, { t: "play" }>
const chains = (s: St, side: S) => cg.legalActions(s,
    side).filter((a) => a.t === "chain") as ChainAct[]
const chainOf = (s: St, side: S, id: string) => chains(s,
    side).filter((a) => s.players[side].hand.find((c) => c.uid === a.uid)?.id === id)
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
/** Sylas (A) dùng R đoạt `key` của `hero` bên B */
function steal(s0: St, hero: string, key: "Q" | "E" | "R"): { s: St; card: cg.Card } {
    const c = skill(s0,
        "sylas",
        "A",
        "R")
    s0.players.A.hand.push(c)
    const opt = (cg.legalActions(s0,
        "A").filter((a) => a.t === "play" && a.uid === c.uid) as PlayAct[]).find((a) => a.args?.target === `B:${hero}` && a.args?.pick?.endsWith(`:${key}`))
    assert.ok(opt,
        `không có lựa chọn ${hero} ${key}`)
    const { s } = passAll(act(s0,
        opt).s)
    const card = s.players.A.hand.find((x) => x.id === `${hero}_${key.toLowerCase()}` && x.data?.stolen)
    assert.ok(card)
    return {
        s, card
    }
}

/** A dùng lá chiêu lên B, B nối Mel E rồi Bỏ qua hết: trả sự kiện và state */
function mirror(s: St, card: cg.Card, args: cg.PlayArgs = {
}, side: S = "B") {
    const open = cast(s,
        side === "B" ? "A" : "B",
        card,
        args,
        false)
    const opt = chainOf(open.s,
        side,
        "mel_e")
    assert.equal(opt.length,
        1,
        "Mel E nối được")
    const r0 = act(open.s,
        opt[0])
    return passAll(r0.s,
        [...open.ev,
            ...r0.ev])
}
/** Các nhát Mel tung lại: sau sự kiện play có mirror */
const stabs = (ev: Ev) => {
    const at = ev.findIndex((e) => e.t === "play" && e.mirror)
    return at < 0 ? [] : ev.slice(at).filter((e) => e.t === "damage" && e.tag === "skill")
}
/** Trận B có Mel, tay B có lá E; A chủ động */
function guarded(a: Record<string, number>, b: Record<string, number>, keep: string[] = []) {
    const s = mk({
        A: a, B: {
            mel: 4, ...b
        }
    })
    for (const h of [...Object.keys(a),
        ...Object.keys(b)]) if (!keep.includes(h)) {
        const x = s.units[`A:${h}`] ?? s.units[`B:${h}`]
        x.maxHp = x.hp = 9000
    }
    s.players.B.hand.push(skill(s,
        "mel",
        "B",
        "E"))
    return s
}

G("Mel nội tại")
test("Q: mục tiêu q1 tia, 2 đường kề mỗi tướng q4 tia, mỗi tia gắn Chói Lọi riêng",
    () => {
        const s = mk({
            A: {
                mel: 2
            }, B: {
                garen: 2, braum: 1, zed: 3, teemo: 4
            }
        })
        for (const h of ["garen",
            "braum",
            "zed",
            "teemo"]) tank(s,
            "B",
            h)
        boost(s,
            "A",
            "mel",
            (1 - p.p1) / p.p2 + 1)
        const r = cast(s,
            "A",
            skill(s,
                "mel",
                "A",
                "Q"),
            {
                target: "B:garen"
            })
        assert.equal(glowOf(r.s,
            "B",
            "garen"),
        p.q1)
        assert.equal(glowOf(r.s,
            "B",
            "braum"),
        p.q4)
        assert.equal(glowOf(r.s,
            "B",
            "zed"),
        p.q4)
        assert.equal(glowOf(r.s,
            "B",
            "teemo"),
        0)
    })
test("Q: mỗi tia q2 + q3·AP phép, thêm p5 mỗi Chói Lọi đang có; một nhịp",
    () => {
        const s = mk({
            A: {
                mel: 2
            }, B: {
                garen: 2, braum: 1
            }
        })
        tank(s,
            "B",
            "garen")
        tank(s,
            "B",
            "braum")
        boost(s,
            "A",
            "mel",
            100)
        glow(s,
            "B",
            "braum",
            5)
        const raw = gm(s).f(u(s,
            "A",
            "mel"),
        km.x("q2 + q3·AP"))
        const r = cast(s,
            "A",
            skill(s,
                "mel",
                "A",
                "Q"),
            {
                target: "B:garen"
            })
        const hits = r.ev.filter((e) => e.t === "damage" && (e.target === "B:garen" || e.target === "B:braum"))
        assert.equal(hits.length,
            p.q1 + p.q4)
        assert.equal(new Set(hits.map((e) => e.t === "damage" ? e.visualGroup : "")).size,
            1,
            "một nhịp")
        const first = hits.find((e) => e.t === "damage" && e.target === "B:braum")
        assert.equal(first?.t === "damage" ? first.amount : 0,
            mit(raw + p.p5 * 5,
                mr(s,
                    "B",
                    "braum")),
            "tia đọc Chói Lọi đang có")
    })
test("đòn thường gây phép và chạm ngưỡng hạ",
    () => {
        const s = mk({
            A: {
                mel: 2
            }, B: {
                garen: 2
            }
        })
        const t = u(s,
            "B",
            "garen")
        glow(s,
            "B",
            "garen",
            5)
        t.maxHp = 9000
        t.hp = line(5) + 20
        const r = basic(s,
            "A",
            "A:mel",
            "B:garen")
        assert.ok(r.ev.some((e) => e.t === "damage" && e.target === "B:garen" && e.kind === "magic" && e.tag === "attack"))
        assert.equal(u(r.s,
            "B",
            "garen").status,
        "dead",
        "đòn đánh đưa Máu xuống ngưỡng thì bị hạ")
    })
test("ngưỡng p3 + p4·Chói Lọi: đúng bằng ngưỡng bị hạ, trên ngưỡng 1 thì sống",
    () => {
        const run = (extra: number) => {
            const s = mk({
                A: {
                    mel: 2
                }, B: {
                    garen: 2
                }
            })
            const t = u(s,
                "B",
                "garen")
            glow(s,
                "B",
                "garen",
                4)
            t.maxHp = 9000
            const c = skill(s,
                "mel",
                "A",
                "Q")
            const raw = mit(gm(s).f(u(s,
                "A",
                "mel"),
            km.x("q2 + q3·AP")) + p.p5 * 4,
            mr(s,
                "B",
                "garen"))
            t.hp = line(4) + raw + extra
            // tia đầu đưa Máu về đúng ngưỡng + extra
            const r = cast(s,
                "A",
                {
                    ...c
                },
                {
                    target: "B:garen"
                })
            return r.ev.filter((e) => e.t === "damage" && e.target === "B:garen").length
        }
        assert.equal(run(0),
            2,
            "tia đầu + cú hạ, các tia sau không bắn")
        assert.ok(run(1) >= p.q1,
            "trên ngưỡng 1 Máu: tia đầu không hạ")
    })
test("không có Chói Lọi thì không có ngưỡng",
    () => {
        const s = mk({
            A: {
                mel: 2
            }, B: {
                garen: 2
            }
        })
        const t = u(s,
            "B",
            "garen")
        t.maxHp = 9000
        t.hp = 200
        const r = basic(s,
            "A",
            "A:mel",
            "B:garen")
        assert.equal(u(r.s,
            "B",
            "garen").status,
        "board")
    })
test("tướng mang chết mất một nửa, Mel chết không đổi, đầu lượt không cháy",
    () => {
        const s = mk({
            A: {
                mel: 2
            }, B: {
                garen: 2, braum: 1
            }
        })
        glow(s,
            "B",
            "garen",
            7)
        glow(s,
            "B",
            "braum",
            6)
        const g = gm(s)
        g.kill(u(s,
            "A",
            "mel"))
        assert.equal(glowOf(s,
            "B",
            "garen"),
        7)
        g.kill(u(s,
            "B",
            "garen"))
        assert.equal(glowOf(s,
            "B",
            "garen"),
        3)
        const e = endTurn(s)
        assert.equal(dmgOn(e.ev,
            "B:braum"),
        0,
        "Chói Lọi không tự cháy")
    })
test("sát thương chuẩn của ngưỡng xuyên Khiên: bị hạ dù còn Khiên",
    () => {
        const s = mk({
            A: {
                mel: 2
            }, B: {
                garen: 2
            }
        })
        const t = u(s,
            "B",
            "garen")
        glow(s,
            "B",
            "garen",
            5)
        t.maxHp = 9000
        t.hp = 30
        gm(s).shield(undefined,
            t,
            20)
        const r = basic(s,
            "A",
            "A:mel",
            "B:garen")
        assert.equal(u(r.s,
            "B",
            "garen").status,
        "dead")
    })

G("Mel E Phản Quang Chiết Kính")
test("không dùng chủ động",
    () => {
        const s = guarded({
            ahri: 2
        },
        {
            garen: 2
        })
        s.active = "B"
        const c = s.players.B.hand[0]
        assert.ok(!cg.legalActions(s,
            "B").some((a) => a.t === "play" && a.uid === c.uid))
    })
test("giảm đúng e1%: chiêu vẫn trúng, không huỷ",
    () => {
        const s = guarded({
            garen: 2
        },
        {
            zed: 2
        })
        const raw = gm(s).f(u(s,
            "A",
            "garen"),
        cg.kit("garen").x("q1 + q2·AD"))
        const r = mirror(s,
            skill(s,
                "garen",
                "A",
                "Q"))
        assert.ok(!r.ev.some((e) => e.t === "chainCancel"),
            "không Vô Hiệu")
        assert.equal(dmgOn(r.ev,
            "B:zed"),
        mit(raw * (1 - p.e1 / 100),
            gm(s).armor(u(s,
                "B",
                "zed"))))
    })
test("phản đúng e2% phần thực chịu, cùng loại, qua Giáp kẻ dùng; gắn e3 Chói Lọi; thêm p5 mỗi Chói Lọi có sẵn",
    () => {
        const s = guarded({
            garen: 2
        },
        {
            zed: 2
        })
        glow(s,
            "A",
            "garen",
            2)
        const r = mirror(s,
            skill(s,
                "garen",
                "A",
                "Q"))
        const taken = dmgOn(r.ev,
            "B:zed")
        const armor = gm(s).armor(u(s,
            "A",
            "garen"))
        const back = stabs(r.ev)
        const phys = back.find((e) => e.t === "damage" && e.kind === "physical")
        const magic = back.find((e) => e.t === "damage" && e.kind === "magic")
        assert.equal(phys?.t === "damage" ? phys.amount : -1,
            mit(taken * p.e2 / 100,
                armor))
        assert.equal(magic?.t === "damage" ? magic.amount : -1,
            mit(p.p5 * 2,
                mr(s,
                    "A",
                    "garen")))
        assert.equal(glowOf(r.s,
            "A",
            "garen"),
        2 + p.e3)
    })
test("Khiên hấp thụ tính vào phần thực chịu: Máu mất + Khiên, không phải chỉ Máu",
    () => {
        const shielded = guarded({
            garen: 2
        },
        {
            zed: 2
        })
        gm(shielded).shield(undefined,
            u(shielded,
                "B",
                "zed"),
            5000)
        const r = mirror(shielded,
            skill(shielded,
                "garen",
                "A",
                "Q"))
        const ev = r.ev.find((e) => e.t === "damage" && e.target === "B:zed")
        assert.ok(ev?.t === "damage" && ev.hpLost === 0 && ev.absorbed > 0,
            "Khiên đỡ hết")
        const back = stabs(r.ev).find((e) => e.t === "damage" && e.kind === "physical")
        assert.ok(back?.t === "damage" && ev?.t === "damage" && back.amount === mit(ev.absorbed * p.e2 / 100,
            gm(shielded).armor(u(shielded,
                "A",
                "garen"))),
        "phản tính cả phần Khiên")
    })
test("phản Choáng: kẻ dùng mất đúng số lượt của mình như tướng được bảo vệ",
    () => {
        const s = guarded({
            leona: 2
        },
        {
            zed: 2
        })
        const r = mirror(s,
            skill(s,
                "leona",
                "A",
                "Q"))
        assert.ok(u(r.s,
            "B",
            "zed").statuses.stun,
        "tướng được bảo vệ vẫn bị Choáng")
        const ev = r.ev.find((e) => e.t === "status" && e.id === "stun" && e.target === "B:zed")
        const n = Math.ceil(ev?.t === "status" ? ev.turns : 1) // q3 = 1 chắc chắn, phần lẻ theo Giáp có thể thêm 1
        const st = u(r.s,
            "A",
            "leona").statuses.stun
        assert.ok(st,
            "kẻ dùng bị Choáng")
        assert.equal(st.until,
            r.s.turnNo + 2 * n,
            "hết sau lượt kế của chính nó")
        let t = endTurn(r.s).s
        t = endTurn(t).s
        assert.equal(t.active,
            "A")
        if (n === 1) assert.ok(u(t,
            "A",
            "leona").statuses.stun,
        "lượt kế của kẻ dùng còn Choáng")
        for (let i = 0; i < 2 * n; i++) t = endTurn(t).s
        assert.ok(!u(t,
            "A",
            "leona").statuses.stun,
        "hết hạn")
    })
test("phản Câm Lặng: cùng số đơn vị",
    () => {
        const s = guarded({
            garen: 2
        },
        {
            zed: 2
        })
        const r = mirror(s,
            skill(s,
                "garen",
                "A",
                "Q"))
        const st = u(r.s,
            "A",
            "garen").statuses.silence
        assert.ok(st,
            "kẻ dùng bị Câm Lặng")
        assert.equal(st.until,
            r.s.turnNo + 2 * Math.ceil(cg.kit("garen").p.q3))
    })
test("phản Rã Giáp: Kog'Maw Q trả Rã Giáp",
    () => {
        const s = guarded({
            kogmaw: 2
        },
        {
            zed: 2
        })
        const r = mirror(s,
            skill(s,
                "kogmaw",
                "A",
                "Q"),
            {
                target: "B:zed"
            })
        assert.ok(u(r.s,
            "A",
            "kogmaw").statuses.shred)
    })
test("chiêu bị huỷ ở mắt xích dưới: không phản, không gắn dấu",
    () => {
        const s = guarded({
            garen: 2
        },
        {
            zed: 2
        })
        const open = cast(s,
            "A",
            skill(s,
                "garen",
                "A",
                "Q"),
            {
            },
            false)
        gm(open.s).status(u(open.s,
            "A",
            "garen"),
        "stun",
        1,
        {
            of: "A"
        })
        const r0 = act(open.s,
            chainOf(open.s,
                "B",
                "mel_e")[0])
        const r = passAll(r0.s,
            r0.ev)
        assert.ok(r.ev.some((e) => e.t === "chainCancel"))
        assert.equal(stabs(r.ev).length,
            0)
        assert.equal(glowOf(r.s,
            "A",
            "garen"),
        0)
    })
test("Malphite Liên Kết: chỉ tính phần tướng được bảo vệ, giảm chỉ áp cho nó",
    () => {
        const s = guarded({
            garen: 2
        },
        {
            zed: 2, malphite: 1
        })
        const g = gm(s)
        for (const h of ["zed",
            "malphite"]) g.status(u(s,
            "B",
            h),
        "stone_link",
        1,
        {
            until: cg.FOREVER, src: "B:malphite"
        })
        const raw = g.f(u(s,
            "A",
            "garen"),
        cg.kit("garen").x("q1 + q2·AD"))
        const r = mirror(s,
            skill(s,
                "garen",
                "A",
                "Q"))
        const onZed = dmgOn(r.ev,
            "B:zed")
        assert.equal(onZed,
            mit(raw / 2 * (1 - p.e1 / 100),
                gm(s).armor(u(s,
                    "B",
                    "zed"))))
        assert.equal(dmgOn(r.ev,
            "B:malphite"),
        mit(raw / 2,
            gm(s).armor(u(s,
                "B",
                "malphite"))),
        "đồng minh liên kết không được giảm")
        const back = stabs(r.ev).find((e) => e.t === "damage" && e.kind === "physical")
        assert.equal(back?.t === "damage" ? back.amount : -1,
            mit(onZed * p.e2 / 100,
                gm(s).armor(u(s,
                    "A",
                    "garen"))))
    })
test("Braum E cùng Chuỗi: mỗi mắt xích chỉ nối 1 lá; Braum đỡ thay thì Mel E không còn cửa",
    () => {
        const s = guarded({
            garen: 2
        },
        {
            zed: 2, braum: 1
        })
        s.players.B.hand.push(skill(s,
            "braum",
            "B",
            "E"))
        const open = cast(s,
            "A",
            skill(s,
                "garen",
                "A",
                "Q"),
            {
            },
            false)
        assert.equal(chainOf(open.s,
            "B",
            "mel_e").length,
        1)
        const braum = chainOf(open.s,
            "B",
            "braum_e")
        assert.equal(braum.length,
            1)
        const r0 = act(open.s,
            braum[0])
        const r = passAll(r0.s,
            r0.ev)
        assert.equal(dmgOn(r.ev,
            "B:zed"),
        0,
        "Braum nhận thay")
        assert.equal(stabs(r.ev).length,
            0,
            "không có phản vì Mel E chưa dùng")
        assert.equal(r.s.players.B.hand.filter((c) => c.id === "mel_e").length,
            1)
    })
test("không nối với chiêu cả phe hay đòn đánh",
    () => {
        const s = mk({
            A: {
                mel: 2
            }, B: {
                brand: 2
            }
        })
        s.active = "B"
        s.players.A.hand.push(skill(s,
            "mel",
            "A",
            "E"))
        const r = cast(s,
            "B",
            skill(s,
                "brand",
                "B",
                "E"),
            {
            },
            false)
        assert.equal(r.s.phase === "chain" ? chainOf(r.s,
            "A",
            "mel_e").length : 0,
        0)
        const s2 = mk({
            A: {
                mel: 2
            }, B: {
                brand: 2
            }
        })
        s2.active = "B"
        s2.players.A.hand.push(skill(s2,
            "mel",
            "A",
            "E"))
        const b = cast(s2,
            "B",
            sup(s2,
                "basic"),
            {
                actor: "B:brand", target: "A:mel"
            },
            false)
        assert.equal(b.s.phase === "chain" ? chainOf(b.s,
            "A",
            "mel_e").length : 0,
        0)
    })

G("Mel R")
test("không có Chói Lọi vẫn dùng được: mọi địch trên sân nhận r1 + r2·AP",
    () => {
        const s = mk({
            A: {
                mel: 2
            }, B: {
                garen: 2, braum: 1
            }
        })
        tank(s,
            "B",
            "garen")
        tank(s,
            "B",
            "braum")
        boost(s,
            "A",
            "mel",
            100)
        const raw = gm(s).f(u(s,
            "A",
            "mel"),
        km.x("r1 + r2·AP"))
        const r = cast(s,
            "A",
            skill(s,
                "mel",
                "A",
                "R"))
        assert.equal(dmgOn(r.ev,
            "B:garen"),
        mit(raw,
            mr(s,
                "B",
                "garen")))
        assert.equal(dmgOn(r.ev,
            "B:braum"),
        mit(raw,
            mr(s,
                "B",
                "braum")))
    })
test("có Chói Lọi: thêm r3 + p5 mỗi tầng rồi tiêu hết",
    () => {
        const s = mk({
            A: {
                mel: 2
            }, B: {
                garen: 2
            }
        })
        tank(s,
            "B",
            "garen")
        glow(s,
            "B",
            "garen",
            5)
        const raw = gm(s).f(u(s,
            "A",
            "mel"),
        km.x("r1 + r2·AP")) + (p.r3 + p.p5) * 5
        const r = cast(s,
            "A",
            skill(s,
                "mel",
                "A",
                "R"))
        assert.equal(dmgOn(r.ev,
            "B:garen"),
        mit(raw,
            mr(s,
                "B",
                "garen")))
        assert.equal(glowOf(r.s,
            "B",
            "garen"),
        0)
    })
test("ngưỡng hạ áp trước khi tiêu: R đưa Máu xuống dưới ngưỡng thì bị hạ",
    () => {
        const s = mk({
            A: {
                mel: 2
            }, B: {
                garen: 2
            }
        })
        const t = u(s,
            "B",
            "garen")
        glow(s,
            "B",
            "garen",
            6)
        t.maxHp = 9000
        const raw = mit(gm(s).f(u(s,
            "A",
            "mel"),
        km.x("r1 + r2·AP")) + (p.r3 + p.p5) * 6,
        mr(s,
            "B",
            "garen"))
        t.hp = raw + line(6)
        const r = cast(s,
            "A",
            skill(s,
                "mel",
                "A",
                "R"))
        assert.equal(u(r.s,
            "B",
            "garen").status,
        "dead")
        assert.equal(glowOf(r.s,
            "B",
            "garen"),
        0,
        "dấu đã tiêu")
    })

G("Cặp Mel và Sylas")
test("Sylas đoạt Mel R: luôn hiện; tính p5, r3 theo Chói Lọi đang có, ngưỡng hạ vẫn áp",
    () => {
        const s0 = mk({
            A: {
                sylas: 2, soraka: 1
            }, B: {
                mel: 2, garen: 1
            }
        })
        const t = u(s0,
            "B",
            "garen")
        glow(s0,
            "B",
            "garen",
            6)
        t.maxHp = 9000
        const st = steal(s0,
            "mel",
            "R")
        const raw = mit(gm(st.s).f(u(st.s,
            "A",
            "sylas"),
        km.x("r1 + r2·AP")) + (p.r3 + p.p5) * 6,
        mr(st.s,
            "B",
            "garen"))
        st.s.units["B:garen"].hp = raw + line(6)
        const r = act(st.s,
            {
                t: "play", side: "A", uid: st.card.uid, args: {
                }
            })
        const done = passAll(r.s,
            r.ev)
        assert.equal(u(done.s,
            "B",
            "garen").status,
        "dead",
        "ngưỡng hạ áp khi Sylas dùng")
        assert.equal(glowOf(done.s,
            "B",
            "garen"),
        0)
    })
test("Sylas đoạt Mel Q: Chói Lọi lên địch theo AP Sylas, Mel địch không kích hoạt ngưỡng",
    () => {
        const s0 = mk({
            A: {
                sylas: 2
            }, B: {
                mel: 2
            }
        })
        tank(s0,
            "B",
            "mel")
        boost(s0,
            "A",
            "sylas",
            (1 - p.p1) / p.p2 + 1)
        const st = steal(s0,
            "mel",
            "Q")
        const done = passAll(act(st.s,
            {
                t: "play", side: "A", uid: st.card.uid, args: {
                    target: "B:mel"
                }
            }).s)
        assert.equal(glowOf(done.s,
            "B",
            "mel"),
        p.q1)
    })
test("Sylas đoạt E rồi phản lại Mel: Mel Q nhắm Sylas, Sylas dùng Chiêu Đoạt, Mel ăn phản",
    () => {
        const s0 = mk({
            A: {
                sylas: 2
            }, B: {
                mel: 2, ahri: 1
            }
        })
        tank(s0,
            "A",
            "sylas")
        tank(s0,
            "B",
            "mel")
        const st = steal(s0,
            "mel",
            "E")
        assert.equal(cg.legalActions(st.s,
            "A").filter((a) => a.t === "play" && a.uid === st.card.uid).length,
        0,
        "không dùng chủ động")
        const s = endTurn(st.s).s
        s.players.B.hand = []
        const raw = gm(s).f(u(s,
            "B",
            "mel"),
        km.x("q2 + q3·AP"))
        const open = cast(s,
            "B",
            skill(s,
                "mel",
                "B",
                "Q"),
            {
                target: "A:sylas"
            },
            false)
        const opt = chains(open.s,
            "A").filter((a) => a.uid === st.card.uid)
        assert.equal(opt.length,
            1,
            "Chiêu Đoạt Quick nối được")
        const r0 = act(open.s,
            opt[0])
        const r = passAll(r0.s,
            r0.ev)
        const first = r.ev.find((e) => e.t === "damage" && e.target === "A:sylas")
        assert.equal(first?.t === "damage" ? first.amount : -1,
            mit(raw * (1 - p.e1 / 100),
                mr(s,
                    "A",
                    "sylas")),
            "tia đầu giảm e1%")
        const back = stabs(r.ev)
        assert.ok(back.length >= 1 && back.every((e) => e.t === "damage" && e.target === "B:mel"),
            "Mel ăn phản")
        assert.equal(glowOf(r.s,
            "B",
            "mel"),
        p.e3)
        assert.ok(!r.s.players.A.hand.some((c) => c.uid === st.card.uid),
            "dùng xong biến mất")
    })
test("Chiêu Đoạt E không tạo vòng lặp: Mel cầm E cũng không nối lên được, phản đúng 1 đợt",
    () => {
        const s0 = mk({
            A: {
                sylas: 2
            }, B: {
                mel: 2, ahri: 1
            }
        })
        tank(s0,
            "A",
            "sylas")
        tank(s0,
            "B",
            "mel")
        const st = steal(s0,
            "mel",
            "E")
        const s = endTurn(st.s).s
        s.players.B.hand = [skill(s,
            "mel",
            "B",
            "E")]
        const open = cast(s,
            "B",
            skill(s,
                "mel",
                "B",
                "Q"),
            {
                target: "A:sylas"
            },
            false)
        const opt = chains(open.s,
            "A").find((a) => a.uid === st.card.uid)
        const r0 = act(open.s,
            opt!)
        assert.equal(r0.s.phase === "chain" ? chainOf(r0.s,
            "B",
            "mel_e").length : 0,
        0,
        "Mel không nối được lên Chiêu Đoạt E")
        const r = passAll(r0.s,
            r0.ev)
        assert.equal(r.s.chain,
            null)
        assert.equal(r.ev.filter((e) => e.t === "chainResolve").length,
            2)
        assert.equal(new Set(stabs(r.ev).map((e) => e.t === "damage" ? e.target : "")).size,
            1)
        assert.ok(r.s.players.B.hand.some((c) => c.id === "mel_e"),
            "lá E của Mel còn")
    })
test("Mel E phản Chiêu Đoạt của Sylas: chiêu vẫn trúng giảm e1%, lá không vào mộ, Sylas nhận lại sát thương chuẩn",
    () => {
        const s1 = mk({
            A: {
                sylas: 2
            }, B: {
                mel: 2, garen: 1
            }
        })
        const q = steal(s1,
            "garen",
            "R")
        tank(q.s,
            "A",
            "sylas")
        tank(q.s,
            "B",
            "garen")
        q.s.players.B.hand.push(skill(q.s,
            "mel",
            "B",
            "E"))
        const open = act(q.s,
            {
                t: "play", side: "A", uid: q.card.uid, args: {
                    target: "B:garen"
                }
            })
        assert.equal(open.s.phase,
            "chain")
        const opt = chainOf(open.s,
            "B",
            "mel_e")
        assert.equal(opt.length,
            1)
        const r0 = act(open.s,
            opt[0])
        const r = passAll(r0.s,
            r0.ev)
        const taken = dmgOn(r.ev,
            "B:garen")
        assert.ok(taken > 0)
        const back = stabs(r.ev).find((e) => e.t === "damage" && e.kind === "true")
        assert.equal(back?.t === "damage" ? back.amount : -1,
            Math.round(taken * p.e2 / 100))
        assert.ok(!r.s.players.A.grave.some((c) => c.uid === q.card.uid))
    })
test("Blitzcrank E giật lá phản: Mel E không có tác dụng, chiêu dưới trúng đủ, không phản, không dấu",
    () => {
        const s = mk({
            A: {
                blitzcrank: 2, ahri: 1
            }, B: {
                mel: 2
            }
        })
        tank(s,
            "B",
            "mel")
        tank(s,
            "A",
            "blitzcrank")
        s.players.B.hand.push(skill(s,
            "mel",
            "B",
            "E"))
        const clean = structuredClone(s)
        clean.players.B.hand = [sup(clean,
            "gold")]
        const c0 = cast(clean,
            "A",
            skill(clean,
                "blitzcrank",
                "A",
                "Q"),
            {
                target: "B:mel"
            })
        s.players.A.hand.push(skill(s,
            "blitzcrank",
            "A",
            "E"))
        const open = cast(s,
            "A",
            skill(s,
                "blitzcrank",
                "A",
                "Q"),
            {
                target: "B:mel"
            },
            false)
        const mel = chainOf(open.s,
            "B",
            "mel_e")
        assert.equal(mel.length,
            1,
            "Mel nối lên chiêu của Blitz")
        const r1 = act(open.s,
            mel[0])
        const blitz = chainOf(r1.s,
            "A",
            "blitzcrank_e")
        assert.equal(blitz.length,
            1,
            "Blitz nối lên Mel E")
        const r2 = act(r1.s,
            blitz[0])
        const r = passAll(r2.s,
            [...r1.ev,
                ...r2.ev])
        assert.ok(r.ev.some((e) => e.t === "chainCancel"),
            "Mel E bị huỷ")
        assert.equal(stabs(r.ev).length,
            0,
            "không phản")
        assert.equal(glowOf(r.s,
            "A",
            "blitzcrank"),
        0)
        assert.equal(dmgOn(r.ev,
            "B:mel"),
        dmgOn(c0.ev,
            "B:mel"),
        "chiêu dưới không bị giảm")
    })
test("Mel E phản Blitz E không được: Blitz E không nhắm đúng 1 tướng",
    () => {
        const s = mk({
            A: {
                mel: 2, ahri: 1
            }, B: {
                blitzcrank: 2
            }
        })
        tank(s,
            "B",
            "blitzcrank")
        s.players.A.hand.push(skill(s,
            "mel",
            "A",
            "E"))
        s.players.B.hand.push(skill(s,
            "blitzcrank",
            "B",
            "E"))
        const open = cast(s,
            "A",
            skill(s,
                "mel",
                "A",
                "Q"),
            {
                target: "B:blitzcrank"
            },
            false)
        const blitz = chainOf(open.s,
            "B",
            "blitzcrank_e")
        assert.equal(blitz.length,
            1)
        const r = act(open.s,
            blitz[0])
        assert.equal(r.s.phase === "chain" ? chainOf(r.s,
            "A",
            "mel_e").length : 0,
        0)
    })
test("Renata P cứu kẻ bị Mel hạ theo ngưỡng: không mất mạng, chỉ 1 lần",
    () => {
        const s = mk({
            A: {
                mel: 2
            }, B: {
                garen: 2, renata: 1
            }
        })
        const t = u(s,
            "B",
            "garen")
        t.maxHp = 9000
        t.hp = 60
        glow(s,
            "B",
            "garen",
            5)
        const lives = s.players.B.lives
        const r = basic(s,
            "A",
            "A:mel",
            "B:garen")
        assert.equal(u(r.s,
            "B",
            "garen").status,
        "board",
        "Renata cứu")
        assert.equal(r.s.players.B.lives,
            lives)
        assert.equal(u(r.s,
            "B",
            "garen").hp,
        Math.round(9000 * cg.kit("renata").p.p5))
        assert.ok(r.ev.some((e) => e.t === "damage" && e.target === "B:garen" && e.kind === "true" && e.visuals?.includes("melExecute")),
            "có sự kiện vẽ cú hạ")
    })
test("Aatrox R: biến hình cứu chết trước ngưỡng hạ, lần sau mới bị hạ",
    () => {
        const s = mk({
            A: {
                mel: 2
            }, B: {
                aatrox: 2
            }
        })
        const t = u(s,
            "B",
            "aatrox")
        t.maxHp = 9000
        t.hp = 8000
        s.active = "B"
        s.teamMana!.B = 200
        const c = skill(s,
            "aatrox",
            "B",
            "R")
        const f = cast(s,
            "B",
            c)
        assert.ok(u(f.s,
            "B",
            "aatrox").transform,
        "đang biến hình")
        f.s.active = "A"
        const live = u(f.s,
            "B",
            "aatrox")
        live.hp = 40
        glow(f.s,
            "B",
            "aatrox",
            5)
        const r = basic(f.s,
            "A",
            "A:mel",
            "B:aatrox")
        const a = u(r.s,
            "B",
            "aatrox")
        assert.equal(a.status,
            "board",
            "biến hình cứu chết")
        assert.ok(a.hp > 40,
            "về lại theo reviveHp")
    })
test("Sylas đoạt Aatrox R: quét theo AP, biến hình giữ, ngưỡng Mel vẫn đi qua cứu chết của Sylas",
    () => {
        const s0 = mk({
            A: {
                sylas: 2
            }, B: {
                aatrox: 1, mel: 2
            }
        })
        tank(s0,
            "B",
            "aatrox")
        tank(s0,
            "B",
            "mel")
        const st = steal(s0,
            "aatrox",
            "R")
        const done = passAll(act(st.s,
            {
                t: "play", side: "A", uid: st.card.uid, args: {
                }
            }).s)
        const me = u(done.s,
            "A",
            "sylas")
        assert.ok(me.transform,
            "Sylas biến hình")
        done.s.active = "B"
        me.hp = 10
        glow(done.s,
            "A",
            "sylas",
            5)
        const r = basic(done.s,
            "B",
            "B:mel",
            "A:sylas")
        assert.equal(u(r.s,
            "A",
            "sylas").status,
        "board",
        "cứu chết của biến hình chạy trên Sylas")
    })

test("Renata cứu khỏi ngưỡng: tia kế của cùng lá Q không hạ lại",
    () => {
        const s = cg.newGame(1,
            ["mel",
                "ahri",
                "braum",
                "zed",
                "darius"],
            ["renata",
                "lux",
                "leona",
                "garen",
                "soraka"])
        cg.applyStage(s,
            {
                board: {
                    mel: 2, garen: 2, renata: 1
                }, hands: {
                    mel: ["mel_q"]
                }, first: "mel", hp: {
                    garen: 170
                }, stacks: {
                    garen: {
                        mel_glow: 12
                    }
                }
            })
        const c = s.players.A.hand[0]
        const r = cg.applyAction(s,
            {
                t: "play", side: "A", uid: c.uid, args: {
                    target: "B:garen"
                }
            })
        assert.equal(r.state.units["B:garen"].status,
            "board")
        assert.ok(r.state.units["B:garen"].hp > 0)
    })
G("Phản từng nhát")
test("Mel E không phản được Vel'Koz R: tia bắn ngẫu nhiên, không nhắm riêng Mel",
    () => {
        const s = mk({
            A: {
                velkoz: 2
            }, B: {
                mel: 2, garen: 1
            }
        })
        for (const x of Object.values(s.units)) x.maxHp = x.hp = 9000
        s.players.B.hand.push(skill(s,
            "mel",
            "B",
            "E"))
        const open = cast(s,
            "A",
            skill(s,
                "velkoz",
                "A",
                "R"),
            {
            },
            false)
        assert.equal(chainOf(open.s,
            "B",
            "mel_e").length,
        0,
        "Mel E không nối được lên chiêu không nhắm ai")
    })

test("khống chế trả về theo e4%: 0 thì không dính, 100 thì đủ, tỉ lệ giữa là xác suất",
    () => {
        const stunned = (pct: number) => {
            p.e4 = pct
            const s = mk({
                A: {
                    leona: 2
                }, B: {
                    mel: 1, zed: 2
                }
            })
            for (const x of Object.values(s.units)) x.maxHp = x.hp = 9000
            s.players.B.hand.push(skill(s,
                "mel",
                "B",
                "E"))
            const r = mirror(s,
                skill(s,
                    "leona",
                    "A",
                    "Q"))
            p.e4 = 100
            return !!u(r.s,
                "A",
                "leona").statuses.stun
        }
        assert.equal(stunned(0),
            false)
        assert.equal(stunned(100),
            true)
        assert.ok(E4 > 0 && E4 < 100,
            "JSON để tỉ lệ giữa")
    })

report()
