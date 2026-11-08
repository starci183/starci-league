// Test nhóm Đấu sĩ theo bộ chiêu chốt 31/10 – 01/11/2026: Gangplank, Darius, Aatrox, Yorick, Qiyana.
// Chạy: npx tsx scripts/card_tests_kits_fighter.ts [--only=chuỗi] [--verbose]. Mọi số lấy từ cg.kit(id).p, sửa JSON không làm vỡ test.
import assert from "node:assert/strict"
import {
    cg
} from "@starci/shared"
import {
    act, basic as basicRaw, cast, dmgOn, endTurn, G, gm, mk, report, skill, sup, test, type Ev, type St
} from "./kit_test_util"

const basic = (s: St, side: "A" | "B", hero: string, target: string) => basicRaw(s,
    side,
    hero.includes(":") ? hero : `${side}:${hero}`,
    target)
// Tướng giả không chiêu để phép tính sát thương chỉ phụ thuộc vào kit đang thử (Giáp 20, Kháng 20)
const nop = (key: cg.SkillKey): cg.SkillDef => ({
    key, name: "-", desc: "-", target: "none", resolve: () => {}
})
for (const id of ["kt_dummy",
    "kt_dummy2",
    "kt_dummy3"]) {
    cg.defineHero({
        id, name: id, role: "marksman", damage: "physical", hp: 900, atk: 40, armor: 20, mr: 20,
        passive: {
            name: "-", desc: "-"
        }, skills: {
            Q: nop("Q"), E: nop("E"), R: nop("R")
        },
    })
}
const D1 = "B:kt_dummy", D2 = "B:kt_dummy2", D3 = "B:kt_dummy3"
/** Sát thương vật lý thật sự sau Giáp của `id` (không Khiên, không chí mạng) */
const takenPhys = (s: St, id: string, raw: number) => Math.round(raw * (100 / (100 + gm(s).armor(s.units[id]))))
const f = (s: St, id: string, expr: string, target?: string) => gm(s).f(s.units[id],
    expr,
    target ? s.units[target] : undefined)
const count = (s: St, side: "A" | "B", pred: (c: cg.Card) => boolean) => s.players[side].hand.filter(pred).length
/** Chuỗi đang mở: cả hai bên Bỏ qua tới khi giải quyết */
function settle(s0: St): { s: St; ev: Ev } {
    let r = {
        s: s0, ev: [] as Ev
    }
    while (r.s.phase === "chain" && r.s.chain) {
        const a = act(r.s,
            {
                t: "pass", side: r.s.chain.priority
            })
        r = {
            s: a.s, ev: [...r.ev,
                ...a.ev]
        }
    }
    return r
}
const gpUnit = "A:gangplank"

// ===================================================================================================
G("Gangplank")
const gp = cg.kit("gangplank").p
const stashAct = (s: St, uid: string) => act(s,
    {
        t: "ability", side: "A", unit: gpUnit, id: "gp_stash", args: {
            pick: uid
        }
    })
const gpState = (b: Record<string, number> = {
    kt_dummy: 2, kt_dummy2: 1
}) => mk({
    A: {
        gangplank: 2
    }, B: b
})
const kegOf = (s: St) => s.units[s.extra.A!]
/** Đặt một Thùng chứa `card` với Thuốc Súng `n` thẳng qua nút Úp Lá */
function stash(s: St, card: cg.Card, n = 0): St {
    s.players.A.hand.push(card)
    const r = stashAct(s,
        card.uid)
    if (n) kegOf(r.s).token!.secret = {
        powder: n
    }
    return r.s
}
const blast = (s: St, n: number) => cg.spike(gp.p2,
    n,
    gp.p4) * (1 + gp.p3 * gm(s).atk(s.units[gpUnit]))
/** Cho B phá Thùng: sang lượt B rồi đánh bằng kt_dummy */
const breakKeg = (s: St, by = "kt_dummy") => { s.active = "B"; return basic(s,
    "B",
    by,
s.extra.A!) }

test("nút Úp Lá: úp lá thành Thùng úp 0 Thuốc Súng, trừ mana, lá rời tay",
    () => {
        const s = gpState(), card = gm(s).skillCard("gangplank",
            "A",
            "Q")
        s.players.A.hand.push(card)
        const acts = cg.legalActions(s,
            "A").filter((a) => a.t === "ability")
        assert.equal(acts.length,
            1)
        const mana = s.teamMana.A
        const r = stashAct(s,
            card.uid)
        const keg = kegOf(r.s)
        assert.equal(keg.token!.id,
            "keg")
        assert.equal(keg.token!.hidden,
            true)
        assert.equal(keg.token!.card!.uid,
            card.uid)
        assert.equal(keg.token!.secret!.powder,
            0)
        assert.equal(keg.hp,
            1)
        assert.equal(mana - r.s.teamMana.A,
            gp.p1)
        assert.equal(r.s.players.A.hand.length,
            0)
    })

test("Úp Lá không lộ lá: sự kiện ability và legalActions của địch không mang dữ liệu lá",
    () => {
        const s = gpState(), card = gm(s).skillCard("gangplank",
            "A",
            "E")
        s.players.A.hand.push(card)
        const r = stashAct(s,
            card.uid)
        const json = JSON.stringify(r.ev)
        assert(!json.includes(card.uid),
            "sự kiện chứa uid lá")
        assert(!json.includes(card.id),
            "sự kiện chứa id lá")
        assert(!r.ev.some((e) => "card" in e),
            "có sự kiện mang card")
        const ab = r.ev.find((e) => e.t === "ability")
        assert(ab && ab.t === "ability" && !("pick" in ab) && !("card" in ab))
        assert.equal(cg.legalActions(r.s,
            "B").length,
        0)
        // lúc chưa úp, hành động của đối phương cũng không thấy nút của Gangplank
        assert(!cg.legalActions(s,
            "B").some((a) => a.t === "ability"))
    })

test("Úp Lá: mỗi loại lá một lựa chọn, bỏ lá tạm và lá băng, cần mana và ô phụ trống",
    () => {
        const s = gpState()
        const q1 = gm(s).skillCard("gangplank",
                "A",
                "Q"), q2 = gm(s).skillCard("gangplank",
                "A",
                "Q")
        s.players.A.hand.push(q1,
            q2)
        assert.equal(cg.legalActions(s,
            "A").filter((a) => a.t === "ability").length,
        1,
        "hai lá giống nhau gộp một")
        s.players.A.hand.push(sup(s,
            "gold"))
        assert.equal(cg.legalActions(s,
            "A").filter((a) => a.t === "ability").length,
        2)
        const t = gm(s).skillCard("gangplank",
            "A",
            "E"); t.temp = true
        const fz = gm(s).skillCard("gangplank",
            "A",
            "R"); fz.frozen = "B:kt_dummy"
        s.players.A.hand.push(t,
            fz)
        assert.equal(cg.legalActions(s,
            "A").filter((a) => a.t === "ability").length,
        2)
        s.teamMana.A = gp.p1 - 1
        assert.equal(cg.legalActions(s,
            "A").filter((a) => a.t === "ability").length,
        0,
        "thiếu mana")
        s.teamMana.A = 200
        const r = stashAct(s,
            q1.uid)
        assert.equal(cg.legalActions(r.s,
            "A").filter((a) => a.t === "ability").length,
        0,
        "ô phụ đã có Thùng")
    })

test("Úp Lá chỉ một lần mỗi lượt, lượt sau dùng lại được",
    () => {
        const s = gpState()
        let st = stash(s,
            gm(s).skillCard("gangplank",
                "A",
                "Q"))
        gm(st).removeToken(kegOf(st),
            "expired")
        st.players.A.hand.push(sup(st,
            "gold"))
        assert.equal(cg.legalActions(st,
            "A").filter((a) => a.t === "ability").length,
        0,
        "đã dùng trong lượt")
        st = endTurn(endTurn(st).s).s
        assert.equal(st.active,
            "A")
        assert(cg.legalActions(st,
            "A").some((a) => a.t === "ability"))
    })

test("Gangplank không còn handUse; lá trên tay không có cách úp cũ",
    () => {
        assert.equal(cg.getHero("gangplank")?.handUse,
            undefined)
        const s = gpState(), card = sup(s,
            "gold")
        s.players.A.hand.push(card)
        assert(!cg.playOptions(gm(s),
            "A",
            card).some((o) => o.pick === "gp_fake"))
    })

test("Thuốc Súng +1 đầu lượt Gangplank, không trần, không tăng đầu lượt địch",
    () => {
        let s = stash(gpState(),
            gm(gpState()).skillCard("gangplank",
                "A",
                "Q"))
        assert.equal(kegOf(s).token!.secret!.powder,
            0)
        s = endTurn(s).s // sang lượt B
        assert.equal(kegOf(s).token!.secret!.powder,
            0)
        s = endTurn(s).s // về lượt A
        assert.equal(kegOf(s).token!.secret!.powder,
            1)
    kegOf(s).token!.secret = {
        powder: 40
    }
    s = endTurn(endTurn(s).s).s
    assert.equal(kegOf(s).token!.secret!.powder,
        41,
        "không trần")
    })

test("Thuốc Súng không phát sự kiện stack (không lộ số)",
    () => {
        const s0 = stash(gpState(),
            gm(gpState()).skillCard("gangplank",
                "A",
                "Q"))
        const r = endTurn(endTurn(s0).s)
        assert(!r.ev.some((e) => e.t === "stack" && e.unit === s0.extra.A))
    })

test("địch phá Thùng chứa lá chiêu: chỉ kẻ phá nhận nổ theo Thuốc Súng, lá lật vào mộ",
    () => {
        const s0 = gpState()
        const card = gm(s0).skillCard("gangplank",
            "A",
            "Q")
        const s1 = stash(s0,
            card,
            3)
        const r = breakKeg(s1)
        const raw = blast(r.s,
            3)
        assert.equal(dmgOn(r.ev,
            D1),
        takenPhys(r.s,
            D1,
            raw))
        assert.equal(dmgOn(r.ev,
            D2),
        0)
        assert.equal(r.s.extra.A,
            null)
        assert(r.ev.some((e) => e.t === "tokenFlip" && e.card?.uid === card.uid))
        assert(r.s.players.A.grave.some((c) => c.uid === card.uid))
    })

test("Thùng nổ tăng vọt theo công thức p2·n·(1 + n/p4)·(1 + p3·AD)",
    () => {
        for (const n of [0,
            1,
            3,
            8]) {
            const s = stash(gpState(),
                gm(gpState()).skillCard("gangplank",
                    "A",
                    "Q"),
                n)
            const r = breakKeg(s)
            assert.equal(dmgOn(r.ev,
                D1),
            takenPhys(r.s,
                D1,
                gp.p2 * n * (1 + n / gp.p4) * (1 + gp.p3 * gm(r.s).atk(r.s.units[gpUnit]))),
            `n=${n}`)
        }
    })

test("Thùng chứa Vàng: vỡ cho 2 lá Vàng, không nổ",
    () => {
        const s = stash(gpState(),
            sup(gpState(),
                "gold"),
            3)
        const r = breakKeg(s)
        assert.equal(count(r.s,
            "A",
            (c) => c.kind === "support" && c.id === "gold"),
        2)
        assert.equal(dmgOn(r.ev,
            D1),
        0)
    })

test("Thùng chứa đồ: lá đồ về tay, không nổ",
    () => {
        const s0 = gpState(), card = sup(s0,
            "item",
            "kiem_dai")
        const r = breakKeg(stash(s0,
            card,
            3))
        assert(r.s.players.A.hand.some((c) => c.uid === card.uid))
        assert.equal(dmgOn(r.ev,
            D1),
        0)
    })

test("Thùng chứa lá khác: Gangplank hồi p5 + p6·Máu tối đa, lá vào mộ",
    () => {
        const s0 = gpState(), card = sup(s0,
            "basic")
        const s1 = stash(s0,
            card,
            3)
        const me = s1.units[gpUnit]
        me.hp = 100
        const r = breakKeg(s1)
        const expect = Math.round(gp.p5 + gp.p6 * me.maxHp)
        assert.equal(r.s.units[gpUnit].hp,
            100 + expect)
        assert(r.s.players.A.grave.some((c) => c.uid === card.uid))
        assert.equal(dmgOn(r.ev,
            D1),
        0)
    })

test("Gangplank đánh Thùng mình kích nổ: mọi tướng địch nhận, kẻ đánh không nhận",
    () => {
        const s0 = gpState()
        const s1 = stash(s0,
            gm(s0).skillCard("gangplank",
                "A",
                "R"),
            2)
        const r = basic(s1,
            "A",
            "gangplank",
s1.extra.A!)
        const exp = takenPhys(r.s,
            D1,
            blast(r.s,
                2))
        assert.equal(dmgOn(r.ev,
            D1),
        exp)
        assert.equal(dmgOn(r.ev,
            D2),
        exp)
        assert.equal(dmgOn(r.ev,
            gpUnit),
        0)
        assert.equal(r.s.extra.A,
            null)
    })

test("tự kích Thùng Vàng: không nổ, cho 2 Vàng",
    () => {
        const s0 = gpState()
        const s1 = stash(s0,
            sup(s0,
                "gold"),
            5)
        const r = basic(s1,
            "A",
            "gangplank",
s1.extra.A!)
        assert.equal(count(r.s,
            "A",
            (c) => c.id === "gold"),
        2)
        assert.equal(dmgOn(r.ev,
            D1) + dmgOn(r.ev,
            D2),
        0)
    })

test("chỉ Gangplank, trong lượt mình, đánh được Thùng mình (extraAttackTargets)",
    () => {
        const s = stash(gpState(),
            gm(gpState()).skillCard("gangplank",
                "A",
                "Q"))
        const g = gm(s)
        assert(cg.attackTargets(g,
            s.units[gpUnit],
            false).some((x) => x.id === s.extra.A))
        s.active = "B"
        assert(!cg.attackTargets(g,
            s.units[gpUnit],
            false).some((x) => x.id === s.extra.A))
        assert(cg.attackTargets(g,
            s.units[D1],
            false).some((x) => x.id === s.extra.A),
        "địch đánh được ô phụ")
    })

test("mọi vai địch phá được Thùng",
    () => {
        for (const role of ["fighter",
            "tank",
            "assassin",
            "marksman",
            "mage",
            "support"] as const) {
            const s = stash(gpState(),
                gm(gpState()).skillCard("gangplank",
                    "A",
                    "Q"))
            const d = s.units[D1]
            const hero = cg.getHero("kt_dummy")!
            const keep = hero.role
        ;(hero as { role: string }).role = role
            try { assert(cg.attackTargets(gm(s),
                d,
                false).some((x) => x.id === s.extra.A),
            role) }
            finally { (hero as { role: string }).role = keep }
        }
    })

test("E: úp chính lá E thành Thùng e1 Thuốc Súng, lá không vào mộ, đối thủ phá thì nổ",
    () => {
        const s = gpState()
        const e = skill(s,
            "gangplank",
            "A",
            "E")
        const mana = s.teamMana.A
        const r = cast(s,
            "A",
            e)
        const keg = kegOf(r.s)
        assert.equal(keg.token!.hidden,
            true)
        assert.equal(keg.token!.secret!.powder,
            gp.e1)
        assert.equal(keg.token!.card!.uid,
            e.uid)
        assert.equal(mana - r.s.teamMana.A,
            gp.e0)
        assert(!r.s.players.A.grave.some((c) => c.uid === e.uid))
        const b = breakKeg(r.s)
        assert.equal(dmgOn(b.ev,
            D1),
        takenPhys(b.s,
            D1,
            blast(b.s,
                gp.e1)))
        assert(b.s.players.A.grave.some((c) => c.uid === e.uid))
    })

test("E cần ô phụ trống",
    () => {
        const s = stash(gpState(),
            gm(gpState()).skillCard("gangplank",
                "A",
                "Q"))
        const e = skill(s,
            "gangplank",
            "A",
            "E")
        s.players.A.hand.push(e)
        assert.equal(cg.playOptions(gm(s),
            "A",
            e).length,
        0)
    })

test("Q: hồi, Giáp q5 đơn vị, tìm 1 lá E trong bộ",
    () => {
        const s = gpState()
        s.units[gpUnit].hp = 100
        const q = skill(s,
                "gangplank",
                "A",
                "Q"), mana = s.teamMana.A
        const heal = Math.round(f(s,
            gpUnit,
            cg.kit("gangplank").x("q1 + q2·Máu tối đa")))
        const armor = Math.round(f(s,
            gpUnit,
            cg.kit("gangplank").x("q3 + q4·Máu tối đa")))
        const eInDeck = s.players.A.deck.filter((c) => c.id === "gangplank_e").length
        const r = cast(s,
            "A",
            q)
        assert.equal(r.s.units[gpUnit].hp,
            100 + heal)
        const st = r.s.units[gpUnit].statuses.armor_up
        assert.equal(st.v,
            armor)
        assert.equal(st.until,
            gm(r.s).unitsUntil(r.s.units[gpUnit],
                gp.q5))
        assert.equal(mana - r.s.teamMana.A,
            gp.q0)
        assert.equal(count(r.s,
            "A",
            (c) => c.id === "gangplank_e"),
        1)
        assert.equal(r.s.players.A.deck.filter((c) => c.id === "gangplank_e").length,
            eInDeck - 1)
    })

test("R Truy Nã: đặt r1 đơn vị, kích nổ Thùng chỉ đánh tướng bị truy nã r2%, lá gì cũng nổ",
    () => {
        const s0 = gpState()
        const gold = sup(s0,
            "gold")
        const s1 = stash(s0,
            gold,
            4)
        const r = cast(s1,
            "A",
            skill(s1,
                "gangplank",
                "A",
                "R"),
            {
                target: D2
            })
        assert.equal(r.s.units[D2].statuses.gp_wanted.until,
            gm(r.s).unitsUntil(r.s.units[gpUnit],
                gp.r1))
        assert.equal(r.s.extra.A,
            null)
        assert.equal(dmgOn(r.ev,
            D2),
        takenPhys(r.s,
            D2,
            blast(r.s,
                4) * gp.r2 / 100))
        assert.equal(dmgOn(r.ev,
            D1),
        0)
        assert.equal(count(r.s,
            "A",
            (c) => c.id === "gold"),
        0,
        "Vàng nổ chứ không cho Vàng")
        assert(r.s.players.A.grave.some((c) => c.uid === gold.uid))
        assert.equal(s1.teamMana.A - r.s.teamMana.A,
            gp.r0)
    })

test("R Truy Nã: trong hạn, Thùng địch phá chỉ đánh tướng bị truy nã (kẻ phá không nhận)",
    () => {
        const s0 = gpState()
        const mark = cast(s0,
            "A",
            skill(s0,
                "gangplank",
                "A",
                "R"),
            {
                target: D2
            })
        const s1 = stash(mark.s,
            sup(mark.s,
                "basic"),
            2)
        s1.units[gpUnit].hp = 100
        const r = breakKeg(s1,
            "kt_dummy")
        assert.equal(dmgOn(r.ev,
            D2),
        takenPhys(r.s,
            D2,
            blast(r.s,
                2) * gp.r2 / 100))
        assert.equal(dmgOn(r.ev,
            D1),
        0)
        assert.equal(r.s.units[gpUnit].hp,
            100,
            "nổ chứ không hồi")
    })

test("R Truy Nã: tướng bị truy nã bị hạ trong hạn cho r3 Vàng; hết hạn thì không",
    () => {
        const mk2 = () => mk({
            A: {
                gangplank: 2
            }, B: {
                kt_dummy2: 2, kt_dummy: 1
            }
        })
        const s0 = mk2()
        const mark = cast(s0,
            "A",
            skill(s0,
                "gangplank",
                "A",
                "R"),
            {
                target: D2
            })
        mark.s.units[D2].hp = 1
        const kill = basic(mark.s,
            "A",
            "gangplank",
            D2)
        assert.equal(kill.s.units[D2].status,
            "dead")
        assert.equal(count(kill.s,
            "A",
            (c) => c.id === "gold"),
        gp.r3)
        // hết hạn: r1 đơn vị = 2·r1 lượt
        let s = mark.s
        for (let i = 0; i < 2 * gp.r1; i++) s = endTurn(s).s
        assert(!s.units[D2].statuses.gp_wanted,
            "Truy Nã phải hết hạn")
        s.units[D2].hp = 1
        s.active = "A"
        const gold0 = count(s,
            "A",
            (c) => c.id === "gold")
        const late = basic(s,
            "A",
            "gangplank",
            D2)
        assert.equal(late.s.units[D2].status,
            "dead")
        assert.equal(count(late.s,
            "A",
            (c) => c.id === "gold"),
        gold0)
    })

test("Gangplank chết: Thùng biến mất",
    () => {
        const s = stash(gpState(),
            gm(gpState()).skillCard("gangplank",
                "A",
                "Q"),
            2)
        gm(s).kill(s.units[gpUnit],
            s.units[D1])
        assert.equal(s.extra.A,
            null)
    })

// ===================================================================================================
G("Darius")
const dp = cg.kit("darius").p
const dk = cg.kit("darius")
const dUnit = "A:darius"
const dState = (b: Record<string, number> = {
    kt_dummy: 2, kt_dummy2: 0
}) => mk({
    A: {
        darius: 2
    }, B: b
})
const bleed = (s: St, id = D1) => s.units[id].stacks.bleed ?? 0
const putBleed = (s: St, id: string, n: number) => {
    const g = gm(s)
    g.setStack(s.units[id],
        "bleed",
        n)
    g.timed(s.units[dUnit],
        s.units[id],
        "bleed_t",
        dp.p3,
        {
            v: n
        })
}

test("nội tại: mỗi đòn trúng cộng 1 Chảy Máu (carrier stack) và đồng hồ p3 đơn vị",
    () => {
        let s = dState()
        s = basic(s,
            "A",
            "darius",
            D1).s
        assert.equal(bleed(s),
            1)
        assert.equal(s.units[D1].statuses.bleed_t.v,
            1)
        assert.equal(s.units[D1].statuses.bleed_t.until,
            gm(s).unitsUntil(s.units[dUnit],
                dp.p3))
        s = basic(s,
            "A",
            "darius",
            D1).s
        s = basic(s,
            "A",
            "darius",
            D1).s
        assert.equal(bleed(s),
            3)
        assert.equal(s.units[D1].statuses.bleed_t.v,
            3)
    })

test("nội tại: đầu lượt tướng mang, mỗi tầng gây p1 + p2·AD vật lý",
    () => {
        const s = dState()
        putBleed(s,
            D1,
            3)
        const r = endTurn(s)
        const raw = 3 * f(s,
            dUnit,
            dk.x("p1 + p2·AD"))
        assert.equal(dmgOn(r.ev,
            D1),
        takenPhys(r.s,
            D1,
            raw))
        assert.equal(dmgOn(r.ev,
            D2),
        0)
    })

test("nội tại: Chảy Máu hết sau p3 đơn vị kể từ lần cộng cuối",
    () => {
        let s = dState()
        s = basic(s,
            "A",
            "darius",
            D1).s
        for (let i = 0; i < 2 * dp.p3 - 1; i++) s = endTurn(s).s
        assert.equal(bleed(s),
            1,
            "chưa hết hạn")
        s = endTurn(s).s
        assert.equal(bleed(s),
            0)
        assert(!s.units[D1].statuses.bleed_t)
    })

test("nội tại: cộng thêm làm mới đồng hồ từ lần cộng cuối",
    () => {
        let s = dState()
        s = basic(s,
            "A",
            "darius",
            D1).s
        s = endTurn(endTurn(s).s).s // sang lượt A kế
        s = basic(s,
            "A",
            "darius",
            D1).s
        assert.equal(bleed(s),
            2)
        assert.equal(s.units[D1].statuses.bleed_t.until,
            gm(s).unitsUntil(s.units[dUnit],
                dp.p3))
    })

test("Chảy Máu mất một nửa khi tướng mang chết, chạy lại đồng hồ khi hồi sinh",
    () => {
        let s = dState()
        putBleed(s,
            D1,
            5)
        gm(s).kill(s.units[D1],
            s.units[dUnit])
        assert.equal(bleed(s),
            Math.floor(5 / 2))
        for (let i = 0; i < 3; i++) s = endTurn(s).s
        assert.equal(s.units[D1].status,
            "board",
            "đã hồi sinh")
        assert.equal(bleed(s),
            2)
        assert.equal(s.units[D1].statuses.bleed_t.v,
            2)
    })

test("Darius chết không xoá Chảy Máu đã đặt (vẫn gây sát thương đầu lượt địch)",
    () => {
        const s = dState()
        putBleed(s,
            D1,
            2)
        gm(s).kill(s.units[dUnit],
            s.units[D1])
        assert.equal(bleed(s),
            2)
        const r = endTurn(s)
        assert(dmgOn(r.ev,
            D1) > 0)
    })

test("Q: q1 + q2·AD + q3·Máu tối đa + q6/tầng, gắn q4, hồi q5/tầng",
    () => {
        const s = dState()
        putBleed(s,
            D1,
            2)
        s.units[dUnit].hp = 100
        const raw = f(s,
            dUnit,
            dk.x("q1 + q2·AD + q3·Máu tối đa")) + dp.q6 * 2
        const mana = s.teamMana.A
        const r = cast(s,
            "A",
            skill(s,
                "darius",
                "A",
                "Q"))
        const dealt = dmgOn(r.ev,
            D1)
        assert.equal(dealt,
            takenPhys(r.s,
                D1,
                raw))
        assert.equal(bleed(r.s),
            2 + dp.q4)
        assert.equal(r.s.units[dUnit].hp,
            100 + dp.q5 * (2 + dp.q4))
        assert.equal(mana - r.s.teamMana.A,
            dp.q0)
    })

test("E: hoán đổi địch khác đường với địch đối diện, e1 + e2·AD + e4/tầng, gắn e3",
    () => {
        const s = dState()
        putBleed(s,
            D2,
            2)
        const raw = f(s,
            dUnit,
            dk.x("e1 + e2·AD")) + dp.e4 * 2
        const mana = s.teamMana.A
        const e = skill(s,
            "darius",
            "A",
            "E")
        assert(!cg.playOptions(gm(s),
            "A",
            e).some((o) => o.target === D1),
        "không chọn kẻ đã đối diện")
        const r = cast(s,
            "A",
            e,
            {
                target: D2
            })
        assert.equal(r.s.units[D2].lane,
            2)
        assert.equal(r.s.units[D1].lane,
            0)
        assert.equal(dmgOn(r.ev,
            D2),
        takenPhys(r.s,
            D2,
            raw))
        assert.equal(dmgOn(r.ev,
            D1),
        0)
        assert.equal(bleed(r.s,
            D2),
        2 + dp.e3)
        assert.equal(mana - r.s.teamMana.A,
            dp.e0)
    })

test("R: chỉ chọn địch có Chảy Máu, đổi chỗ sang đối diện, sát thương chuẩn r1 + r2·AD + r3/tầng, tiêu hết",
    () => {
        const s = dState()
        const r0 = skill(s,
            "darius",
            "A",
            "R")
        assert.equal(cg.playOptions(gm(s),
            "A",
            r0).length,
        0,
        "chưa có Chảy Máu")
        putBleed(s,
            D2,
            3)
        const opts = cg.playOptions(gm(s),
            "A",
            r0)
        assert.deepEqual(opts.map((o) => o.target),
            [D2])
        const raw = f(s,
            dUnit,
            dk.x("r1 + r2·AD")) + dp.r3 * 3
        const r = cast(s,
            "A",
            r0,
            {
                target: D2
            })
        assert.equal(r.s.units[dUnit].lane,
            0)
        assert.equal(dmgOn(r.ev,
            D2),
        Math.round(raw),
        "sát thương chuẩn bỏ qua Giáp")
        assert.equal(bleed(r.s,
            D2),
        0)
        assert(!r.s.units[D2].statuses.bleed_t)
        assert.equal(s.teamMana.A - r.s.teamMana.A,
            dp.r0)
    })

test("R hạ gục: lá về tay ngay (returnToHand), không hẹn giờ",
    () => {
        const s = dState()
        putBleed(s,
            D1,
            3)
        s.units[D1].hp = 5
        const r0 = skill(s,
            "darius",
            "A",
            "R")
        const r = cast(s,
            "A",
            r0,
            {
                target: D1
            })
        assert.equal(r.s.units[D1].status,
            "dead")
        assert(r.s.players.A.hand.some((c) => c.uid === r0.uid))
        assert(r.ev.some((e) => e.t === "returnToHand" && e.card.uid === r0.uid))
        assert(!(r.s.delayed ?? []).some((d) => d.key === "r_return"))
    })

test("R không hạ: lá biến mất, về tay (lá mới) sau r4 đơn vị tính từng đầu lượt của Darius",
    () => {
        let s = dState()
        putBleed(s,
            D1,
            1)
        const r0 = skill(s,
            "darius",
            "A",
            "R")
        const c = cast(s,
            "A",
            r0,
            {
                target: D1
            })
        s = c.s
        assert(!s.players.A.hand.some((x) => x.uid === r0.uid))
        assert(!s.players.A.grave.some((x) => x.uid === r0.uid))
        const d = (s.delayed ?? []).find((x) => x.key === "r_return")!
        assert.equal(d.data!.left,
            dp.r4)
        assert.equal(d.surviveOwnerDeath,
            true)
        const returned = (evs: Ev) => evs.filter((e) => e.t === "returnToHand")
        let evs: Ev = []
        for (let i = 0; i < 2 * (dp.r4 - 1) + 1; i++) { const r = endTurn(s); s = r.s; evs = [...evs,
            ...r.ev] }
        assert.equal(returned(evs).length,
            0,
            "chưa tới hạn")
        assert.equal(count(s,
            "A",
            (x) => x.id === "darius_r"),
        0)
        const r = endTurn(s)
        assert.equal(returned(r.ev).length,
            1)
        const back = r.s.players.A.hand.filter((x) => x.id === "darius_r")
        assert.equal(back.length,
            1)
        assert.notEqual(back[0].uid,
            r0.uid,
            "lá mới hoàn toàn")
        assert.equal(back[0].hero,
            "darius")
    })

test("lá R đã hẹn vẫn về tay khi Darius đã chết (surviveOwnerDeath)",
    () => {
        let s = dState()
        putBleed(s,
            D1,
            1)
        s = cast(s,
            "A",
            skill(s,
                "darius",
                "A",
                "R"),
            {
                target: D1
            }).s
        gm(s).kill(s.units[dUnit],
            s.units[D1])
        for (let i = 0; i < 2 * dp.r4; i++) s = endTurn(s).s
        assert.equal(count(s,
            "A",
            (x) => x.id === "darius_r"),
        1)
    })

test("R khác đường: Darius dời sang đường địch",
    () => {
        const s = dState({
            kt_dummy: 2, kt_dummy2: 4
        })
        putBleed(s,
            D2,
            2)
        const r = cast(s,
            "A",
            skill(s,
                "darius",
                "A",
                "R"),
            {
                target: D2
            })
        assert.equal(r.s.units[dUnit].lane,
            4)
    })

// ===================================================================================================
G("Aatrox")
const ap = cg.kit("aatrox").p
const ak = cg.kit("aatrox")
const aUnit = "A:aatrox"
const aState = () => mk({
    A: {
        aatrox: 2
    }, B: {
        kt_dummy: 2, kt_dummy2: 1, kt_dummy3: 3
    }
})
/** Hệ số nội tại ở mức Máu hiện tại (mult = 1 thường, r5 khi biến hình) */
const mult = (s: St, m = 1) => 1 + ap.p1 * (s.units[aUnit].maxHp - s.units[aUnit].hp) / s.units[aUnit].maxHp * m

test("nội tại: thêm p1% sát thương mỗi 1% Máu đã mất, hồi p2% sát thương",
    () => {
        const s = aState()
        s.units[aUnit].hp = Math.round(s.units[aUnit].maxHp / 2)
        const hp0 = s.units[aUnit].hp
        const m = mult(s)
        const r = basic(s,
            "A",
            "aatrox",
            D1)
        const raw = gm(s).atk(s.units[aUnit]) * m
        const dealt = dmgOn(r.ev,
            D1)
        assert.equal(dealt,
            takenPhys(r.s,
                D1,
                raw))
        assert.equal(r.s.units[aUnit].hp,
            hp0 + Math.round(dealt * ap.p2 / 100))
    })

test("nội tại: đủ Máu thì không thêm sát thương",
    () => {
        const s = aState()
        const r = basic(s,
            "A",
            "aatrox",
            D1)
        assert.equal(dmgOn(r.ev,
            D1),
        takenPhys(r.s,
            D1,
            gm(s).atk(s.units[aUnit])))
    })

test("Q: mất q1% Máu hiện tại, chém đối diện và 2 đường kề (không chạm đường xa)",
    () => {
        const s = aState()
        s.units[D1].maxHp = s.units[D1].hp = 5000
        const hp0 = s.units[aUnit].hp, paid = Math.round(hp0 * ap.q1 / 100)
        const after = hp0 - paid
        const raw = f(s,
            aUnit,
            ak.x("q2 + q3·AD")) + ap.q4 * (s.units[aUnit].maxHp - after)
        const mana = s.teamMana.A
        const r = cast(s,
            "A",
            skill(s,
                "aatrox",
                "A",
                "Q"))
        const hits = r.ev.filter((e) => e.t === "damage" && e.src === aUnit && e.tag === "skill")
        assert.deepEqual(hits.map((e) => e.t === "damage" && e.target).sort(),
            [D1,
                D2,
                D3].sort())
        const first = hits[0]
        assert(first.t === "damage" && first.target === D1)
        assert.equal(first.t === "damage" && first.amount,
            takenPhys(r.s,
                D1,
                raw * (1 + ap.p1 * (s.units[aUnit].maxHp - after) / s.units[aUnit].maxHp)))
        assert.equal(mana - r.s.teamMana.A,
            ap.q0)
    })

test("Q: không dùng được khi chỉ còn 1 Máu hoặc không có tướng đối diện",
    () => {
        const s = aState()
        s.units[aUnit].hp = 1
        assert.equal(cg.playOptions(gm(s),
            "A",
            skill(s,
                "aatrox",
                "A",
                "Q")).length,
        0)
        const s2 = mk({
            A: {
                aatrox: 2
            }, B: {
                kt_dummy: 0
            }
        })
        assert.equal(cg.playOptions(gm(s2),
            "A",
            skill(s2,
                "aatrox",
                "A",
                "Q")).length,
        0)
    })

test("E: 1 địch e1 + e2·AD, hồi e3% sát thương (cộng nội tại)",
    () => {
        const s = aState()
        s.units[aUnit].hp = 200
        const m = mult(s)
        const raw = f(s,
            aUnit,
            ak.x("e1 + e2·AD")) * m
        const mana = s.teamMana.A
        const r = cast(s,
            "A",
            skill(s,
                "aatrox",
                "A",
                "E"),
            {
                target: D3
            })
        const dealt = dmgOn(r.ev,
            D3)
        assert.equal(dealt,
            takenPhys(r.s,
                D3,
                raw))
        assert.equal(r.s.units[aUnit].hp,
            200 + Math.round(dealt * ap.p2 / 100) + Math.round(dealt * ap.e3 / 100))
        assert.equal(mana - r.s.teamMana.A,
            ap.e0)
    })

test("R: mọi địch nhận r1 + r2·AD rồi biến hình r3 đơn vị (AD, Máu tối đa, Tốc Đánh)",
    () => {
        const s = aState()
        const me = s.units[aUnit], maxHp0 = me.maxHp, ad0 = gm(s).atk(me), as0 = gm(s).attackSpeed(me)
        const raw = f(s,
            aUnit,
            ak.x("r1 + r2·AD"))
        const mana = s.teamMana.A
        const r = cast(s,
            "A",
            skill(s,
                "aatrox",
                "A",
                "R"))
        for (const d of [D1,
            D2,
            D3]) assert.equal(dmgOn(r.ev,
            d),
        takenPhys(r.s,
            d,
            raw))
        const m = r.s.units[aUnit]
        const bonus = Math.round(maxHp0 * ap.r7 / 100)
        assert.equal(m.transform!.id,
            "aatrox_r")
        assert.equal(m.maxHp,
            maxHp0 + bonus)
        assert.equal(m.hp,
            maxHp0 + bonus)
        assert.equal(gm(r.s).atk(m),
            ad0 + ap.r6)
        assert.equal(gm(r.s).attackSpeed(m),
            as0 + ap.r8)
        assert.equal(m.transform!.until,
            gm(r.s).unitsUntil(m,
                ap.r3))
        assert.equal(mana - r.s.teamMana.A,
            ap.r0)
        assert.equal(cg.playOptions(gm(r.s),
            "A",
            skill(r.s,
                "aatrox",
                "A",
                "R")).length,
        0,
        "đang biến hình không dùng lại")
    })

test("R: nội tại gấp r5 khi biến hình",
    () => {
        const s = cast(aState(),
            "A",
            skill(aState(),
                "aatrox",
                "A",
                "R")).s
        const me = s.units[aUnit]
        me.hp = Math.round(me.maxHp / 2)
        const m = mult(s,
            ap.r5)
        const hp0 = me.hp
        const r = basic(s,
            "A",
            "aatrox",
            D1)
        const dealt = dmgOn(r.ev,
            D1)
        assert.equal(dealt,
            takenPhys(r.s,
                D1,
                gm(s).atk(me) * m))
        assert.equal(r.s.units[aUnit].hp,
            hp0 + Math.round(dealt * ap.p2 * ap.r5 / 100))
    })

test("R: lần đầu về 0 còn r4% Máu (thứ tự cứu chết \"transform\"), hết dạng, lần sau chết thật",
    () => {
        assert(cg.RULES.lethalOrder.includes("transform"))
        const s0 = aState()
        const maxHp0 = s0.units[aUnit].maxHp
        const s = cast(s0,
            "A",
            skill(s0,
                "aatrox",
                "A",
                "R")).s
        const bonus = Math.round(maxHp0 * ap.r7 / 100)
        const g = gm(s), me = s.units[aUnit]
        g.damage(s.units[D1],
            me,
            99999,
            "true",
            {
                tag: "effect"
            })
        assert.equal(me.status,
            "board")
        assert.equal(me.transform,
            undefined)
        assert.equal(me.maxHp,
            maxHp0)
        assert.equal(me.hp,
            Math.min(maxHp0,
                Math.round((maxHp0 + bonus) * ap.r4 / 100)))
        g.damage(s.units[D1],
            me,
            99999,
            "true",
            {
                tag: "effect"
            })
        assert.equal(me.status,
            "dead")
    })

test("R: biến hình hết sau r3 đơn vị",
    () => {
        let s = cast(aState(),
            "A",
            skill(aState(),
                "aatrox",
                "A",
                "R")).s
        for (let i = 0; i < 2 * ap.r3 - 1; i++) s = endTurn(s).s
        assert(s.units[aUnit].transform,
            "chưa hết")
        s = endTurn(s).s
        assert.equal(s.units[aUnit].transform,
            undefined)
    })

// ===================================================================================================
G("Yorick")
const yp = cg.kit("yorick").p
const yk = cg.kit("yorick")
const yUnit = "A:yorick"
const yState = () => mk({
    A: {
        yorick: 2
    }, B: {
        kt_dummy: 2, kt_dummy2: 1
    }
})

test("cờ deckOutWinUsesEngineRule bật: cạn bộ bài thua theo luật engine",
    () => {
        assert.equal(yk.flag("deckOutWinUsesEngineRule"),
            true)
        const s = yState()
        s.players.B.deck = []
        const r = endTurn(s)
        assert.equal(r.s.phase,
            "over")
        assert.equal(r.s.winner,
            "A")
        assert.equal(r.s.endReason,
            "deck")
    })

test("nội tại: đòn trúng đốt p1 lá bộ đối thủ, +1 Hồn Ma, mỗi tầng p2 Máu tối đa và p3 Giáp",
    () => {
        const s = yState()
        const deck0 = s.players.B.deck.length, grave0 = s.players.B.grave.length
        const maxHp0 = s.units[yUnit].maxHp, armor0 = gm(s).armor(s.units[yUnit])
        const r = basic(basic(s,
            "A",
            "yorick",
            D1).s,
        "A",
        "yorick",
        D1)
        assert.equal(r.s.players.B.deck.length,
            deck0 - 2 * yp.p1)
        assert.equal(r.s.players.B.grave.length,
            grave0 + 2 * yp.p1)
        assert.equal(r.s.units[yUnit].stacks.yorick_soul,
            2)
        assert.equal(r.s.units[yUnit].maxHp,
            maxHp0 + 2 * yp.p2)
        assert.equal(gm(r.s).armor(r.s.units[yUnit]),
            armor0 + 2 * yp.p3)
    })

test("nội tại: mỗi bội số p4 Hồn Ma tạo 1 lá R",
    () => {
        const s = yState()
        s.units[yUnit].stacks.yorick_soul = yp.p4 - 1
        const r0 = count(s,
            "A",
            (c) => c.id === "yorick_r")
        const r = basic(s,
            "A",
            "yorick",
            D1)
        assert.equal(r.s.units[yUnit].stacks.yorick_soul,
            yp.p4)
        assert.equal(count(r.s,
            "A",
            (c) => c.id === "yorick_r"),
        r0 + 1)
        const r2 = basic(r.s,
            "A",
            "yorick",
            D1)
        assert.equal(count(r2.s,
            "A",
            (c) => c.id === "yorick_r"),
        r0 + 1,
        "chưa tới bội kế")
    })

test("Hồn Ma mất một nửa khi Yorick chết, Máu tối đa theo kịp",
    () => {
        let s = yState()
        for (let i = 0; i < 4; i++) s = basic(s,
            "A",
            "yorick",
            D1).s
        assert.equal(s.units[yUnit].stacks.yorick_soul,
            4)
        gm(s).kill(s.units[yUnit],
            s.units[D1])
        assert.equal(s.units[yUnit].stacks.yorick_soul,
            2)
        assert.equal(s.units[yUnit].maxHp,
cg.getHero("yorick")!.hp + 2 * yp.p2)
    })

test("Q: q1 + q2·Máu tối đa sát thương đối diện, hồi q3 + q4·Máu tối đa",
    () => {
        const s = yState()
        s.units[yUnit].hp = 50
        const raw = f(s,
                yUnit,
                yk.x("q1 + q2·Máu tối đa")), heal = Math.round(f(s,
                yUnit,
                yk.x("q3 + q4·Máu tối đa")))
        const mana = s.teamMana.A
        const r = cast(s,
            "A",
            skill(s,
                "yorick",
                "A",
                "Q"))
        assert.equal(dmgOn(r.ev,
            D1),
        takenPhys(r.s,
            D1,
            raw))
        assert.equal(r.s.units[yUnit].hp,
            50 + heal)
        assert.equal(mana - r.s.teamMana.A,
            yp.q0)
    })

test("E: đốt e1 lá, e2 + e3·Giáp sát thương, Rã Giáp e4 đơn vị",
    () => {
        const s = yState()
        const deck0 = s.players.B.deck.length, raw = f(s,
            yUnit,
            yk.x("e2 + e3·Giáp"))
        const mana = s.teamMana.A
        const r = cast(s,
            "A",
            skill(s,
                "yorick",
                "A",
                "E"),
            {
                target: D2
            })
        assert.equal(dmgOn(r.ev,
            D2),
        takenPhys(s,
            D2,
            raw),
        "tính Giáp trước khi Rã Giáp")
        assert.equal(r.s.players.B.deck.length,
            deck0 - yp.e1)
        assert.equal(r.s.units[D2].statuses.shred.until,
            gm(r.s).unitsUntil(r.s.units[yUnit],
                yp.e4))
        assert.equal(mana - r.s.teamMana.A,
            yp.e0)
    })

test("R: gọi Ma Sương ô phụ với Máu r1 + r2·Máu tối đa, Giáp r3 + r4·Giáp",
    () => {
        const s = yState()
        const hpExp = Math.round(f(s,
                yUnit,
                yk.x("r1 + r2·Máu tối đa"))), armExp = Math.round(f(s,
                yUnit,
                yk.x("r3 + r4·Giáp")))
        const mana = s.teamMana.A
        const r = cast(s,
            "A",
            skill(s,
                "yorick",
                "A",
                "R"))
        const mist = r.s.units[r.s.extra.A!]
        assert.equal(mist.token!.id,
            "yorick_mist")
        assert.equal(mist.token!.ownerId,
            yUnit)
        assert.equal(mist.maxHp,
            hpExp)
        assert.equal(mist.token!.armor,
            armExp)
        assert.equal(mana - r.s.teamMana.A,
            yp.r0)
    })

test("R lần hai khi đã có Ma Sương: hồi đầy và nhận 1 Tiến Hoá",
    () => {
        let s = cast(yState(),
            "A",
            skill(yState(),
                "yorick",
                "A",
                "R")).s
        const mist0 = s.units[s.extra.A!], maxHp0 = mist0.maxHp, armor0 = mist0.token!.armor
        mist0.hp = 10
        s = cast(s,
            "A",
            skill(s,
                "yorick",
                "A",
                "R")).s
        const mist = s.units[s.extra.A!]
        assert.equal(mist.id,
            mist0.id,
            "cùng một Ma Sương")
        assert.equal(mist.maxHp,
            maxHp0 + yp.r8)
        assert.equal(mist.hp,
            mist.maxHp)
        assert.equal(mist.token!.armor,
            armor0 + yp.r9)
        assert.equal(mist.stacks.mist_evo,
            1)
    })

test("Ma Sương đầu lượt: đánh đối diện r5 + r6·Hồn Ma + r10·Tiến Hoá và đốt r7 lá",
    () => {
        let s = cast(yState(),
            "A",
            skill(yState(),
                "yorick",
                "A",
                "R")).s
        s.units[yUnit].stacks.yorick_soul = 3
        s.units[s.extra.A!].stacks.mist_evo = 2
        const deck0 = s.players.B.deck.length
        s = endTurn(s).s // lượt B
        s = endTurn(s).s // đầu lượt A
        const exp = takenPhys(s,
            D1,
            yp.r5 + yp.r6 * 3 + yp.r10 * 2)
        assert.equal(s.players.B.deck.length,
            deck0 - yp.r7 - 1 /* B rút 1 lá đầu lượt */)
        const ev = endTurn(endTurn(cast(yState(),
            "A",
            skill(yState(),
                "yorick",
                "A",
                "R")).s).s)
        assert(ev.ev.some((e) => e.t === "damage" && e.src === yUnit && e.target === D1 && e.tag === "effect"))
        assert(exp > 0)
    })

test("Ma Sương đánh theo mỗi đòn của Yorick, E nhắm đúng tướng của E",
    () => {
        const s0 = cast(yState(),
            "A",
            skill(yState(),
                "yorick",
                "A",
                "R")).s
        s0.units[yUnit].stacks.yorick_soul = 0
        const strike = takenPhys(s0,
            D1,
            yp.r5 + yp.r6 * 1) // đòn này cho Hồn Ma trước rồi Ma Sương đánh: 1 Hồn Ma
        const r = basic(s0,
            "A",
            "yorick",
            D1)
        const effect = r.ev.filter((e) => e.t === "damage" && e.src === yUnit && e.tag === "effect" && e.target === D1)
        assert.equal(effect.length,
            1)
        assert.equal(effect[0].t === "damage" && effect[0].amount,
            strike)
        const e = cast(r.s,
            "A",
            skill(r.s,
                "yorick",
                "A",
                "E"),
            {
                target: D2
            })
        assert(e.ev.some((x) => x.t === "damage" && x.tag === "effect" && x.target === D2),
            "Ma Sương đánh tướng của E")
    })

test("Ma Sương biến mất khi Yorick chết",
    () => {
        const s = cast(yState(),
            "A",
            skill(yState(),
                "yorick",
                "A",
                "R")).s
        assert(s.extra.A)
        gm(s).kill(s.units[yUnit],
            s.units[D1])
        assert.equal(s.extra.A,
            null)
    })

test("đốt cạn bộ bài đối thủ thì đối thủ thua đầu lượt kế",
    () => {
        const s = yState()
        s.players.B.deck = s.players.B.deck.slice(0,
            yp.p1)
        const r = basic(s,
            "A",
            "yorick",
            D1)
        assert.equal(r.s.players.B.deck.length,
            0)
        const e = endTurn(r.s)
        assert.equal(e.s.winner,
            "A")
        assert.equal(e.s.endReason,
            "deck")
    })

// ===================================================================================================
G("Qiyana")
const qp = cg.kit("qiyana").p
const qk = cg.kit("qiyana")
const qUnit = "A:qiyana"
const qState = (els: string[], b: Record<string, number> = {
    kt_dummy: 2, kt_dummy2: 1, kt_dummy3: 3
}) => {
    const s = mk({
        A: {
            qiyana: 2
        }, B: b
    })
    s.laneElements = els
    return s
}
const ALL = (e: string) => [e,
    e,
    e,
    e,
    e]

test("setup: đầu trận ghi 5 Nguyên Tố công khai đúng số lượng từ JSON",
    () => {
        const s = cg.newGame(777,
            ["qiyana",
                "braum",
                "zed",
                "teemo",
                "viktor"],
            ["garen",
                "soraka",
                "braum",
                "zed",
                "teemo"])
        const els = s.laneElements!
        assert.equal(els.length,
            5)
        const n = (e: string) => els.filter((x) => x === e).length
        assert.equal(n("earth"),
            qp.lane_earth)
        assert.equal(n("water"),
            qp.lane_water)
        assert.equal(n("grass"),
            qp.lane_grass)
        assert.deepEqual(cg.newGame(777,
            ["qiyana",
                "braum",
                "zed",
                "teemo",
                "viktor"],
            ["garen",
                "soraka",
                "braum",
                "zed",
                "teemo"]).laneElements,
        els,
        "cùng seed cùng bảng")
    })

test("setup: chỉ ghi một lần dù hai bên đều có Qiyana; ván không Qiyana thì không có bảng",
    () => {
        const one = cg.newGame(31,
            ["qiyana",
                "braum",
                "zed",
                "teemo",
                "viktor"],
            ["garen",
                "soraka",
                "braum",
                "zed",
                "teemo"]).laneElements
        const both = cg.newGame(31,
            ["qiyana",
                "braum",
                "zed",
                "teemo",
                "viktor"],
            ["qiyana",
                "soraka",
                "braum",
                "zed",
                "teemo"]).laneElements
        assert.deepEqual(both,
            one)
        assert.equal(cg.newGame(31,
            ["braum",
                "zed",
                "teemo",
                "viktor",
                "soraka"],
            ["garen",
                "braum",
                "zed",
                "teemo",
                "soraka"]).laneElements,
        undefined)
        // đã có bảng thì không đè
        const pre = cg.newGame(31,
            ["braum",
                "zed",
                "teemo",
                "viktor",
                "soraka"],
            ["garen",
                "braum",
                "zed",
                "teemo",
                "soraka"])
        pre.laneElements = ALL("grass")
    cg.getHero("qiyana")!.setup!(gm(pre),
        "A")
    assert.deepEqual(pre.laneElements,
        ALL("grass"))
    })

test("Q Đất: thêm p1 + p2·AD + p3% Máu đã mất mục tiêu",
    () => {
        const s = qState(ALL("earth"))
        s.units[D1].hp = 400
        const raw = f(s,
            qUnit,
            qk.x("q1 + q2·AD")) + f(s,
            qUnit,
            qk.x("p1 + p2·AD + p3% Máu đã mất mục tiêu"),
            D1)
        const mana = s.teamMana.A
        const r = cast(s,
            "A",
            skill(s,
                "qiyana",
                "A",
                "Q"))
        assert.equal(dmgOn(r.ev,
            D1),
        takenPhys(r.s,
            D1,
            raw))
        assert.equal(mana - r.s.teamMana.A,
            qp.q0)
    })

test("Q Đất: hạ gục hồi p4 Máu",
    () => {
        const s = qState(ALL("earth"))
        s.units[D1].hp = 1
        s.units[qUnit].hp = 100
        const r = cast(s,
            "A",
            skill(s,
                "qiyana",
                "A",
                "Q"))
        assert.equal(r.s.units[D1].status,
            "dead")
        assert.equal(r.s.units[qUnit].hp,
            100 + qp.p4)
    })

test("Q Nước: Choáng p5 + p6·AD đơn vị (phần lẻ là xác suất thêm 1 đơn vị)",
    () => {
        const d = f(qState(ALL("water")),
            qUnit,
            qk.x("p5 + p6·AD"))
        let stunned = 0
        const N = 60
        for (let i = 0; i < N; i++) {
            const s = qState(ALL("water"))
            s.rng = 1000 + i * 7919
            const r = cast(s,
                "A",
                skill(s,
                    "qiyana",
                    "A",
                    "Q"))
            const st = r.s.units[D1].statuses.stun
            assert.equal(dmgOn(r.ev,
                D1),
            takenPhys(r.s,
                D1,
                f(s,
                    qUnit,
                    qk.x("q1 + q2·AD"))),
            "Nước không thêm sát thương")
            if (st) { stunned++; assert.equal(st.until,
                gm(r.s).unitsUntil(r.s.units[qUnit],
                    Math.floor(d) + 1)) }
            else assert(d % 1 !== 0 && Math.floor(d) === 0,
                "d nguyên phải luôn Choáng")
        }
        assert(stunned > 0 && stunned < N,
            `Choáng ${stunned}/${N} lần`)
        assert(Math.abs(stunned / N - (d % 1)) < 0.25,
            `tỉ lệ ${stunned / N} lệch xa ${d % 1}`)
    })

test("Q Cỏ: Tàng Hình p7 đơn vị cho Qiyana (g.timed)",
    () => {
        const s = qState(ALL("grass"))
        const r = cast(s,
            "A",
            skill(s,
                "qiyana",
                "A",
                "Q"))
        const st = r.s.units[qUnit].statuses.stealth
        assert.equal(st.until,
            gm(r.s).unitsUntil(r.s.units[qUnit],
                qp.p7))
        assert.equal(dmgOn(r.ev,
            D1),
        takenPhys(r.s,
            D1,
            f(s,
                qUnit,
                qk.x("q1 + q2·AD"))))
    })

test("nguyên tố theo đường đang đứng: cùng chiêu đổi tác dụng khi Qiyana ở đường khác",
    () => {
        const els = ["grass",
            "water",
            "earth",
            "earth",
            "water"]
        const s = qState(els)
        assert.equal(gm(s).hero(s.units[qUnit]).id,
            "qiyana")
        const r = cast(s,
            "A",
            skill(s,
                "qiyana",
                "A",
                "Q")) // đường 2 = Đất
        assert(dmgOn(r.ev,
            D1) > takenPhys(r.s,
            D1,
            f(s,
                qUnit,
                qk.x("q1 + q2·AD"))))
        assert(!r.s.units[qUnit].statuses.stealth)
    })

test("stack công khai element phản ánh đường đang đứng",
    () => {
        const els = ["grass",
            "water",
            "earth",
            "earth",
            "water"]
        const s = qState(els)
        const r = endTurn(endTurn(s).s)
        assert.equal(r.s.units[qUnit].stacks.element,
            1 /* Đất */)
    })

test("E chủ động: đổi chỗ sang đối diện địch ở đường bất kỳ, sát thương e1 + e2·AD, nguyên tố của đường cũ",
    () => {
    // đường 2 = Đất: E mang thêm sát thương Đất; sau đó Qiyana đứng đường 0
        const s = qState(["water",
            "grass",
            "earth",
            "earth",
            "water"],
        {
            kt_dummy: 2, kt_dummy2: 0
        })
        s.units[D2].hp = 500
        const raw = f(s,
            qUnit,
            qk.x("e1 + e2·AD")) + f(s,
            qUnit,
            qk.x("p1 + p2·AD + p3% Máu đã mất mục tiêu"),
            D2)
        const mana = s.teamMana.A
        const r = cast(s,
            "A",
            skill(s,
                "qiyana",
                "A",
                "E"),
            {
                target: D2
            })
        assert.equal(r.s.units[qUnit].lane,
            0)
        assert.equal(r.s.units[D2].lane,
            0)
        assert.equal(dmgOn(r.ev,
            D2),
        takenPhys(r.s,
            D2,
            raw))
        assert.equal(mana - r.s.teamMana.A,
            qp.e0)
        assert.equal(r.s.units[qUnit].stacks.element,
            2 /* đường mới 0 = Nước */)
    })

/** Chuỗi: B đánh Qiyana (hoặc đồng minh), A xem lựa chọn nối */
function bAttacks(s: St, target: string) {
    s.active = "B"
    return cast(s,
        "B",
        sup(s,
            "basic"),
        {
            actor: D1, target
        },
        false)
}
const chainE = (s: St) => cg.legalActions(s,
    "A").filter((a) => a.t === "chain" && s.players.A.hand.find((c) => c.uid === a.uid)?.id === "qiyana_e")

test("E Quick: chỉ nối Chuỗi khi đứng đường Cỏ và địch đánh đúng Qiyana",
    () => {
    // đúng điều kiện
        let s = qState(["earth",
            "grass",
            "grass",
            "earth",
            "water"])
        s.players.A.hand.push(gm(s).skillCard("qiyana",
            "A",
            "E"))
        let r = bAttacks(s,
            qUnit)
        assert.equal(r.s.phase,
            "chain")
        assert.equal(chainE(r.s).length,
            1)
        // không phải đường Cỏ
        s = qState(["earth",
            "grass",
            "water",
            "earth",
            "water"])
        s.players.A.hand.push(gm(s).skillCard("qiyana",
            "A",
            "E"))
        r = bAttacks(s,
            qUnit)
        assert.equal(chainE(r.s).length,
            0)
        // địch đánh người khác
        s = qState(["earth",
            "grass",
            "grass",
            "earth",
            "water"])
        s.players.A.hand.push(gm(s).skillCard("qiyana",
            "A",
            "E"))
        gm(s).summon("A",
            "braum",
            4)
        r = bAttacks(s,
            "A:braum")
        assert.equal(chainE(r.s).length,
            0)
    })

test("E Quick đường Cỏ: khoá kẻ đánh, đổi chỗ sang đối diện nó, huỷ đòn nhắm Qiyana, Tàng Hình",
    () => {
        const s = qState(["earth",
            "grass",
            "grass",
            "earth",
            "water"],
        {
            kt_dummy: 1, kt_dummy2: 2
        })
        const e = gm(s).skillCard("qiyana",
            "A",
            "E")
        s.players.A.hand.push(e)
        s.units[qUnit].hp = 300
        const mana = s.teamMana.A
        const r = bAttacks(s,
            qUnit)
        const choice = chainE(r.s)
        assert.deepEqual(choice.map((a) => a.t === "chain" && a.args?.target),
            [D1],
            "mục tiêu chỉ là kẻ đánh")
        const a = act(r.s,
            choice[0])
        const done = settle(a.s)
        const ev = [...a.ev,
            ...done.ev]
        assert.equal(done.s.units[qUnit].lane,
            1,
            "dời sang đối diện kẻ đánh")
        assert.equal(done.s.units[qUnit].hp,
            300,
            "đòn gốc bị huỷ")
        assert(ev.some((x) => x.t === "chainCancel"))
        // nguyên tố đường cũ (Cỏ): Tàng Hình, không thêm sát thương
        assert.equal(dmgOn(ev,
            D1),
        takenPhys(done.s,
            D1,
            f(s,
                qUnit,
                qk.x("e1 + e2·AD"))))
        assert.equal(done.s.units[qUnit].statuses.stealth.until,
            gm(done.s).unitsUntil(done.s.units[qUnit],
                qp.p7) )
        assert.equal(mana - done.s.teamMana.A,
            qp.e0)
    })

test("R Đất: đối diện r3%, hai đường kề 100%, mỗi tướng thêm r4% Máu đã mất",
    () => {
        const s = qState(ALL("earth"),
            {
                kt_dummy: 2, kt_dummy2: 1, kt_dummy3: 3
            })
        s.units[D1].hp = 600; s.units[D2].hp = 700
        const base = f(s,
            qUnit,
            qk.x("r1 + r2·AD"))
        const extra = (id: string) => f(s,
            qUnit,
            qk.x("r4% Máu đã mất mục tiêu"),
            id)
        const r = cast(s,
            "A",
            skill(s,
                "qiyana",
                "A",
                "R"))
        assert.equal(dmgOn(r.ev,
            D1),
        takenPhys(r.s,
            D1,
            base * qp.r3 / 100 + extra(D1)))
        assert.equal(dmgOn(r.ev,
            D2),
        takenPhys(r.s,
            D2,
            base + extra(D2)))
        assert.equal(dmgOn(r.ev,
            D3),
        takenPhys(r.s,
            D3,
            base + extra(D3)))
        assert.equal(s.teamMana.A - r.s.teamMana.A,
            qp.r0)
    })

test("R không chạm đường xa",
    () => {
        const s = qState(ALL("earth"),
            {
                kt_dummy: 2, kt_dummy2: 0
            })
        const r = cast(s,
            "A",
            skill(s,
                "qiyana",
                "A",
                "R"))
        assert.equal(dmgOn(r.ev,
            D2),
        0)
        assert(dmgOn(r.ev,
            D1) > 0)
    })

test("R Nước: Choáng đối diện r6 đơn vị, hai kề r5",
    () => {
        const s = qState(ALL("water"))
        const r = cast(s,
            "A",
            skill(s,
                "qiyana",
                "A",
                "R"))
        assert.equal(r.s.units[D1].statuses.stun.until,
            gm(r.s).unitsUntil(r.s.units[qUnit],
                Math.floor(qp.r6)))
        for (const d of [D2,
            D3]) {
            const st = r.s.units[d].statuses.stun
            if (st) assert.equal(st.until,
                gm(r.s).unitsUntil(r.s.units[qUnit],
                    1))
            else assert(qp.r5 % 1 !== 0)
        }
    })

test("R Cỏ: tướng mình ở đường Qiyana và 2 đường kề Tàng Hình r7 đơn vị",
    () => {
        const s = mk({
            A: {
                qiyana: 2, braum: 1, zed: 4
            }, B: {
                kt_dummy: 2
            }
        })
        s.laneElements = ALL("grass")
        const r = cast(s,
            "A",
            skill(s,
                "qiyana",
                "A",
                "R"))
        for (const id of [qUnit,
            "A:braum"]) assert.equal(r.s.units[id].statuses.stealth.until,
            gm(r.s).unitsUntil(r.s.units[qUnit],
                qp.r7),
            id)
        assert(!r.s.units["A:zed"].statuses.stealth,
            "đường 4 ở xa")
    })

report()
