// Test cân bằng "starci-33 implementation tuning v1" cho nhóm Đấu sĩ + Đỡ đòn:
// Aatrox, Darius, Garen, Gangplank, Yorick, Braum, Blitzcrank, Leona, Malphite, Ornn.
// Chạy: npx tsx scripts/card_tests_balance_fighter_tank.ts [--only=chuỗi] [--verbose]. Khung test chép từ card_tests_heroes_g1.ts.
import assert from "node:assert/strict"
import {
    cg
} from "@starci/shared"
import * as AATROX from "../packages/shared/src/cardgame/heroes/aatrox"
import * as DARIUS from "../packages/shared/src/cardgame/heroes/darius"
import * as GAREN from "../packages/shared/src/cardgame/heroes/garen"
import * as YORICK from "../packages/shared/src/cardgame/heroes/yorick"
import * as BRAUM from "../packages/shared/src/cardgame/heroes/braum"
import * as MALPHITE from "../packages/shared/src/cardgame/heroes/malphite"
import * as GANGPLANK from "../packages/shared/src/cardgame/heroes/gangplank"
type St = ReturnType<typeof cg.newGame>
type Ev = ReturnType<typeof cg.applyAction>["events"]
type S = "A" | "B"
const { Game } = cg

const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7)
const VERBOSE = process.argv.includes("--verbose")
const results: { group: string; name: string; res: "PASS" | "FAIL"; note?: string }[] = []
let group = ""
const G = (name: string) => { group = name }
function test(name: string, fn: () => void) {
    if (only && !`${group} ${name}`.toLowerCase().includes(only.toLowerCase())) return
    try {
        fn()
        results.push({
            group, name, res: "PASS"
        })
    } catch (e) {
        results.push({
            group, name, res: "FAIL", note: (e as Error).message.split("\n").slice(0,
                3).join(" | ") + (VERBOSE ? `\n${(e as Error).stack}` : "")
        })
    }
}

// Tướng giả: không có chiêu
const noSkill = (key: "Q" | "E" | "R") => ({
    key, name: "-", desc: "-", target: "none" as const, canPlay: () => false, resolve: () => {}
})
for (const [id,
    role] of [["ft_tank",
        "tank"],
    ["ft_fighter",
        "fighter"],
    ["ft_mage",
        "mage"],
    ["ft_mark",
        "marksman"],
    ["ft_sup",
        "support"]] as const) {
    cg.defineHero({
        id, name: id, role, damage: "physical", hp: 1000, atk: 50, armor: 30, mr: 30, passive: {
            name: "-", desc: "-"
        }, skills: {
            Q: noSkill("Q"), E: noSkill("E"), R: noSkill("R")
        }
    })
}
const DUMMIES = ["ft_tank",
    "ft_fighter",
    "ft_mage",
    "ft_mark",
    "ft_sup"]
const SEED = 20261031

/** Bàn đủ 5 đường hai bên (luật: không có đường trống). `hero` của phe A đứng ở `lane`. */
function mk(heroA: string, lane = 2, heroB?: string, laneB = 2): St {
    const teamA = [heroA,
        ...DUMMIES.filter((d) => d !== heroA)].slice(0,
        5)
    const teamB = heroB ? [heroB,
        ...DUMMIES.slice(0,
            4)] : [...DUMMIES]
    const s = cg.newGame(SEED,
        teamA,
        teamB)
    s.teamMana = {
        A: 200, B: 200
    }
    s.round = 8
    const g = new Game(s)
    const place = (side: S, team: string[], main: string, at: number) => {
        let l = 0
        g.summon(side,
            main,
            at)
        for (const h of team) {
            if (h === main) continue
            if (l === at) l++
            g.summon(side,
                h,
                l++)
        }
    }
    place("A",
        teamA,
        heroA,
        lane)
    place("B",
        teamB,
        heroB ?? "ft_mage",
        heroB ? laneB : 2)
    s.players.A.hand = []
    s.players.B.hand = []
    s.phase = "main"
    s.opened = {
        A: true, B: true
    }
    s.firstTurnDone = {
        A: true, B: true
    }
    return s
}
const gm = (s: St) => new Game(s)
const u = (s: St, side: S, hero: string) => s.units[`${side}:${hero}`]
const skill = (s: St, hero: string, side: S, k: cg.SkillKey) => gm(s).skillCard(hero,
    side,
    k)
const sup = (s: St, id: cg.SupportId) => gm(s).supportCard(id)
function give(s: St, side: S, card: cg.Card) { s.players[side].hand.push(card); return card }
function settle(r: { s: St; ev: Ev }): { s: St; ev: Ev } {
    let s = r.s
    const ev: Ev = [...r.ev]
    for (let i = 0; i < 20 && s.phase === "chain"; i++) {
        const o = cg.applyAction(s,
            {
                t: "pass", side: cg.whoseMove(s)
            })
        s = o.state
        ev.push(...o.events)
    }
    return {
        s, ev
    }
}
function play(s: St, side: S, card: { uid: string }, args: cg.PlayArgs = {
}) {
    const r = cg.applyAction(s,
        {
            t: "play", side, uid: card.uid, args
        })
    return settle({
        s: r.state, ev: r.events
    })
}
function strike(s: St, side: S, actor: string, target: string) {
    return play(s,
        side,
        give(s,
            side,
            sup(s,
                "basic")),
        {
            actor, target
        })
}
const evs = <T extends cg.GameEvent["t"]>(ev: Ev, t: T) => ev.filter((e) => e.t === t) as Extract<cg.GameEvent, { t: T }>[]
const playable = (s: St, side: S, card: { uid: string }) => cg.legalActions(s,
    side).filter((a) => a.t === "play" && a.uid === card.uid)

// ======================================================================
G("Khống chế theo đơn vị (law.md §4)")
// ======================================================================
test("d nguyên: Choáng 1 đơn vị trong lượt mình hết cuối lượt địch kế; trong lượt địch thì hết chính lượt đó",
    () => {
        const s = mk("braum")
        const g = gm(s)
        const me = u(s,
                "A",
                "braum"), foe = u(s,
                "B",
                "ft_mage")
        s.active = "A"
        assert.equal(BRAUM.ccApply(g,
            me,
            foe,
            "stun",
            1,
            "t"),
        1)
        assert.equal(foe.statuses.stun.until,
            s.turnNo + 1)
        g.removeStatus(foe,
            "stun")
        s.active = "B"
        BRAUM.ccApply(g,
            me,
            foe,
            "stun",
            2,
            "t")
        assert.equal(foe.statuses.stun.until,
            s.turnNo + 2,
            "đơn vị đầu = phần còn lại lượt địch; đơn vị 2 = hết lượt địch kế")
    })
test("phần lẻ: một lần roll; d = 0 thì không gắn; stasis chặn trước khi roll",
    () => {
        const s = mk("braum")
        const g = gm(s)
        const me = u(s,
                "A",
                "braum"), foe = u(s,
                "B",
                "ft_mage")
        assert.equal(BRAUM.ccApply(g,
            me,
            foe,
            "stun",
            0,
            "t"),
        0)
        assert.ok(!g.has(foe,
            "stun"))
        let hits = 0
        for (let i = 0; i < 400; i++) {
            g.removeStatus(foe,
                "stun")
            hits += BRAUM.ccApply(g,
                me,
                foe,
                "stun",
                0.25,
                "t")
        }
        g.removeStatus(foe,
            "stun")
        assert.ok(hits > 50 && hits < 150,
            `0,25 ≈ 25% được 1 đơn vị (được ${hits}/400)`)
        g.status(foe,
            "stasis",
            1)
        const before = s.rng
        assert.equal(BRAUM.ccApply(g,
            me,
            foe,
            "stun",
            1.5,
            "t"),
        0)
        assert.equal(s.rng,
            before,
            "bị chặn thì không roll")
    })

// ======================================================================
G("Braum")
// ======================================================================
test("R không chọn tay: tâm là địch đối diện (Choáng ≥ 1), mọi địch khác chịu d = 0,25 + 0,015/100 Máu + 0,015/10 Giáp + 0,1% AP",
    () => {
        let s = mk("braum")
        const me = u(s,
            "A",
            "braum")
        const r = give(s,
            "A",
            skill(s,
                "braum",
                "A",
                "R"))
        const opts = playable(s,
            "A",
            r)
        assert.equal(opts.length,
            1,
            "không có bước chọn mục tiêu")
        const d = BRAUM.R_BASE + BRAUM.R_PER_100_HP * me.maxHp / 100 + BRAUM.R_PER_10_ARMOR * gm(s).armor(me) / 10
        assert.ok(Math.abs(d - 0.37525) < 1e-9,
            `chỉ số gốc: d = 0,37525 (được ${d})`)
        s = play(s,
            "A",
            r).s
        assert.ok(gm(s).has(u(s,
            "B",
            "ft_mage"),
        "stun"),
        "tâm (đối diện) luôn Choáng")
    })
test("E có quickWhen và điều kiện \"Khi địch\" hiện trên lá",
    () => {
        const def = cg.getHero("braum")!
        assert.match(def.skills.E.desc,
            /Khi địch/)
        assert.equal(typeof def.skills.E.quickWhen,
            "function")
    })

// ======================================================================
G("Leona")
// ======================================================================
test("E tái dùng giữ kho đã gánh; dội một lần cuối cửa sổ với tag effect",
    () => {
        let s = mk("leona")
        const me = u(s,
            "A",
            "leona")
        s = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "leona",
                    "A",
                    "E"))).s
        u(s,
            "A",
            "leona").statuses.guard.v = 100
        s = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "leona",
                    "A",
                    "E"))).s
        assert.equal(gm(s).guardStored(u(s,
            "A",
            "leona")),
        100,
        "tái dùng không xoá kho")
        // cuối lượt của chính Leona: chưa dội
        const g = gm(s)
        const n0 = g.events.length
        g.hook("onTurnEnd",
            {
                side: "A"
            })
        assert.equal(g.events.slice(n0).filter((e) => e.t === "damage").length,
            0)
        // cuối lượt địch (hết cửa sổ): dội đúng một lần, tag effect
        s.turnNo = me.statuses.guard?.until ?? s.turnNo + 1
        const g2 = gm(s)
        const n1 = g2.events.length
        g2.hook("onTurnEnd",
            {
                side: "B"
            })
        const dmg = g2.events.slice(n1).filter((e) => e.t === "damage") as Extract<cg.GameEvent, { t: "damage" }>[]
        assert.equal(dmg.length,
            1)
        assert.equal(dmg[0].tag,
            "effect")
    })

// ======================================================================
G("Malphite")
// ======================================================================
test("P chỉ thay lớp Khiên Đá, không xoá Khiên ngoài",
    () => {
        const s = mk("malphite")
        const g = gm(s)
        const me = u(s,
            "A",
            "malphite")
        const want = Math.round(g.f(me,
            MALPHITE.F_SHIELD))
        g.hook("onTurnStart",
            {
                side: "A"
            })
        assert.equal(me.shield,
            want)
        g.shield(undefined,
            me,
            50) // Khiên ngoài
        g.hook("onTurnStart",
            {
                side: "A"
            })
        assert.equal(me.shield,
            want + 50,
            "Khiên Đá không cộng dồn, Khiên ngoài giữ nguyên")
    })
test("R: mọi địch Choáng ít nhất 1 đơn vị (d = 1 + 0,1% Giáp + 0,1% AP), không còn roll xác suất riêng",
    () => {
        let s = mk("malphite")
        s = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "malphite",
                    "A",
                    "R"))).s
        for (const t of gm(s).heroes("B")) if (t.status === "board") assert.ok(gm(s).has(t,
            "stun"),
        `${t.id} bị Choáng`)
    })

// ======================================================================
G("Aatrox")
// ======================================================================
test("P: phần cộng thêm không chí mạng; E hồi theo Máu + Khiên thực mất (không overkill)",
    () => {
        let s = mk("aatrox")
        const me = u(s,
            "A",
            "aatrox")
        me.hp = me.maxHp - 100
        gm(s).status(me,
            "alwaysCrit",
            1,
            {
                v: 1
            })
        const g = gm(s)
        const extra = 100 * AATROX.PASSIVE_PCT + g.f(me,
            AATROX.F_PASSIVE)
        const r = strike(s,
            "A",
            "A:aatrox",
            "B:ft_mage")
        const dmg = evs(r.ev,
            "damage").filter((e) => e.target === "B:ft_mage" && e.src === "A:aatrox")
        assert.equal(dmg.length,
            2)
        assert.ok(dmg[0].crit,
            "đòn chính chí mạng")
        assert.equal(dmg[1].amount,
            Math.round(extra * 100 / 130),
            "phần nội tại không nhân chí mạng")
        // E: mục tiêu sắp chết, chỉ hồi phần thực mất
        s = r.s
        s = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "aatrox",
                    "A",
                    "E"))).s
        const foe = u(s,
            "B",
            "ft_mage")
        foe.hp = 5
        const a = u(s,
            "A",
            "aatrox")
        a.hp = 50
        s = strike(s,
            "A",
            "A:aatrox",
            "B:ft_mage").s
        assert.ok(u(s,
            "A",
            "aatrox").hp - 50 <= 5,
        "không hồi từ overkill")
    })
test("R: hồi sinh = min(Máu tối đa sau biến hình, round(30% Máu trước + F_R_REVIVE theo AD trước))",
    () => {
        let s = mk("aatrox")
        const preMax = u(s,
            "A",
            "aatrox").maxHp
        const preAd = gm(s).atk(u(s,
            "A",
            "aatrox"))
        s = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "aatrox",
                    "A",
                    "R"))).s
        const me = u(s,
            "A",
            "aatrox")
        assert.equal(me.maxHp,
            preMax + Math.round(preMax * AATROX.R_HP_PCT))
        assert.equal(me.transform?.reviveHp,
            Math.min(me.maxHp,
                Math.round(preMax * AATROX.R_REVIVE_PCT + preAd * parseFloat(AATROX.F_R_REVIVE) / 100)))
    })

// ======================================================================
G("Darius / Garen")
// ======================================================================
test("Chảy Máu và Tội không còn trần (vượt 6 / 10)",
    () => {
        let s = mk("darius")
        gm(s).status(u(s,
            "B",
            "ft_mage"),
        "bleed",
        2,
        {
            v: 6
        })
        for (let i = 0; i < 2; i++) s = strike(s,
            "A",
            "A:darius",
            "B:ft_mage").s
        assert.equal(DARIUS.bleedOf(gm(s),
            u(s,
                "B",
                "ft_mage")),
        8)
        let s2 = mk("garen")
        const foe = u(s2,
            "B",
            "ft_mage")
        gm(s2).status(foe,
            "guilt",
            3,
            {
                v: 12
            })
        s2 = play(s2,
            "A",
            give(s2,
                "A",
                skill(s2,
                    "garen",
                    "A",
                    "E"))).s
        assert.equal(GAREN.guiltOf(gm(s2),
            u(s2,
                "B",
                "ft_mage")),
        15)
    })
test("Garen P: phần cộng theo Tội không chí mạng",
    () => {
        const s = mk("garen")
        const me = u(s,
                "A",
                "garen"), foe = u(s,
                "B",
                "ft_mage")
        gm(s).status(foe,
            "guilt",
            3,
            {
                v: 5
            })
        gm(s).status(me,
            "alwaysCrit",
            1,
            {
                v: 1
            })
        const bonus = 5 * gm(s).f(me,
            GAREN.F_PASSIVE)
        const r = strike(s,
            "A",
            "A:garen",
            "B:ft_mage")
        const dmg = evs(r.ev,
            "damage").filter((e) => e.target === "B:ft_mage" && e.src === "A:garen")
        assert.equal(dmg.length,
            2)
        assert.equal(dmg[1].amount,
            Math.round(bonus * 100 / 130))
        assert.ok(!dmg[1].crit)
    })

// ======================================================================
G("Yorick")
// ======================================================================
test("Ma Sương: nhân 1/(1 + tầng × (0,15 + 0,001 × Giáp)); quyền tìm R giữ khi tay đầy",
    () => {
        const s = mk("yorick")
        const g = gm(s)
        const me = u(s,
            "A",
            "yorick")
        g.status(me,
            YORICK.MIST,
            1,
            {
                v: 3, until: cg.FOREVER
            })
        assert.ok(Math.abs(YORICK.mistMult(g,
            me) - 1 / (1 + 3 * (0.15 + 0.001 * g.armor(me)))) < 1e-12)
        // tay đầy: mốc 20 đạt nhưng chưa lấy được R; quyền còn chờ
        s.players.A.hand = Array.from({
            length: cg.RULES.handMax
        },
        () => g.supportCard("basic"))
        s.players.A.deck = s.players.A.deck.filter((c) => c.id !== "yorick_r")
        const r = g.newCard({
            kind: "skill", id: "yorick_r", hero: "yorick", side: "A"
        })
        s.players.A.deck.unshift(r)
        while (s.players.A.grave.length < 20) s.players.A.grave.push(g.supportCard("basic"))
        g.hook("onTurnEnd",
            {
                side: "A"
            })
        assert.ok(!s.players.A.hand.some((c) => c.id === "yorick_r"))
        s.players.A.hand = []
        g.hook("onTurnEnd",
            {
                side: "A"
            })
        assert.ok(s.players.A.hand.some((c) => c.id === "yorick_r"),
            "quyền chờ được trả khi tay có chỗ")
    })

// ======================================================================
G("Gangplank")
// ======================================================================
test("Úp Thùng giả tốn 15 mana như E thật; ô phụ đang có vật triệu hồi đồng minh thì không đặt được",
    () => {
        let s = mk("gangplank")
        const card = give(s,
            "A",
            sup(s,
                "basic"))
        const m0 = s.teamMana.A
        s = play(s,
            "A",
            card,
            {
                pick: "gp_fake"
            }).s
        assert.equal(m0 - s.teamMana.A,
            GANGPLANK.PLACE_MANA)
        assert.equal(cg.getHero("gangplank")!.skills.E.mana,
            GANGPLANK.PLACE_MANA)
        // ô phụ có token khác của phe: E không đánh được
        const s2 = mk("gangplank")
        gm(s2).summonToken("A",
            {
                id: "dummy_tok", name: "x", hp: 10, armor: 0, mr: 0, ownerId: "A:ft_tank"
            })
        const e = give(s2,
            "A",
            skill(s2,
                "gangplank",
                "A",
                "E"))
        assert.equal(playable(s2,
            "A",
            e).length,
        0)
    })

// ======================================================================
G("Ornn")
// ======================================================================
test("Q Giảm Giáp tới hết lượt địch kế tiếp; dùng trong lượt địch thì hết chính lượt đó",
    () => {
        const s = mk("ornn")
        const g = gm(s)
        const foe = u(s,
            "B",
            "ft_mage")
        s.active = "B"
        const def = cg.getHero("ornn")!
        // gọi resolve trực tiếp với ngữ cảnh tối thiểu
        def.skills.Q.resolve({
            g, side: "A", self: u(s,
                "A",
                "ornn"), card: skill(s,
                "ornn",
                "A",
                "Q"), target: foe, args: {
            }, f: (e: string) => g.f(u(s,
                "A",
                "ornn"),
            e)
        } as never)
        assert.equal(foe.statuses.ornn_shred.until,
            s.turnNo)
    })

// ======================================================================
const pad = (x: string, n: number) => (x.length >= n ? x : x + " ".repeat(n - x.length))
let lastGroup = ""
for (const r of results) {
    if (r.group !== lastGroup) {
        console.log(`\n== ${r.group} ==`)
        lastGroup = r.group
    }
    console.log(`${r.res}  ${pad(r.name,
        100)}${r.note ? `\n        -> ${r.note}` : ""}`)
}
const c = (k: string) => results.filter((r) => r.res === k).length
console.log(`\nTỔNG: ${results.length} test | PASS ${c("PASS")} | FAIL ${c("FAIL")}`)
process.exit(c("FAIL") ? 1 : 0)
