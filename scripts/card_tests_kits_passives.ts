// Test tương tác giữa các nội tại (bản chốt 01/11/2026): hào quang chồng nhau, nội tại kích hoạt từ nguồn của tướng khác, cứu chết với bộ đếm.
// Chạy: npx tsx scripts/card_tests_kits_passives.ts [--only=chuỗi] [--verbose]. Số mong đợi đọc từ balance/heroes/*.json.
import assert from "node:assert/strict"
import {
    cg
} from "@starci/shared"
import {
    G, basic, cast, endTurn, gm, mk, report, skill, test, u, type S, type St
} from "./kit_test_util"

const P = (hero: string, k: string) => cg.kit(hero).p[k]
const equip = (s: St, side: S, hero: string, ...items: string[]) => { const g = gm(s); for (const id of items) g.equip(u(s,
    side,
    hero),
id) }
const stat = (s: St, side: S, hero: string) => gm(s).stats(u(s,
    side,
    hero))
const near = (a: number, b: number, msg: string) => assert.ok(Math.abs(a - b) < 0.51,
    `${msg}: ${a} khác ${b}`)
const addAD = (id: string) => cg.itemBalance(id).stats.atk

G("Ornn Lò Rèn Sống")
const ITEM = "kiem_tu_than"
test("đồ đồng minh tăng đúng p1% ở vòng mặc",
    () => {
        const a = mk({
            A: {
                garen: 0, zed: 1
            }
        })
        equip(a,
            "A",
            "zed",
            ITEM)
        const plain = stat(a,
            "A",
            "zed").atk
        const b = mk({
            A: {
                garen: 0, zed: 1, ornn: 2
            }
        })
        equip(b,
            "A",
            "zed",
            ITEM)
        near(stat(b,
            "A",
            "zed").atk - plain,
        addAD(ITEM) * P("ornn",
            "p1") / 100,
        "AD thêm từ Ornn")
    })
test("mỗi vòng đã mặc tăng thêm p2%",
    () => {
        const s = mk({
            A: {
                zed: 1, ornn: 2
            }
        })
        equip(s,
            "A",
            "zed",
            ITEM)
        const before = stat(s,
            "A",
            "zed").atk
        s.round += 3
        near(stat(s,
            "A",
            "zed").atk - before,
        addAD(ITEM) * 3 * P("ornn",
            "p2") / 100,
        "AD thêm sau 3 vòng")
    })
test("không tăng Máu của đồ",
    () => {
        const a = mk({
            A: {
                zed: 1
            }
        })
        equip(a,
            "A",
            "zed",
            "giap_warmog")
        const b = mk({
            A: {
                zed: 1, ornn: 2
            }
        })
        equip(b,
            "A",
            "zed",
            "giap_warmog")
        assert.equal(u(b,
            "A",
            "zed").maxHp,
        u(a,
            "A",
            "zed").maxHp)
    })
test("Ornn chết thì đồ cả đội về số gốc",
    () => {
        const s = mk({
            A: {
                zed: 1, ornn: 2
            }
        })
        equip(s,
            "A",
            "zed",
            ITEM)
        const on = stat(s,
            "A",
            "zed").atk
        gm(s).kill(u(s,
            "A",
            "ornn"))
        assert.ok(stat(s,
            "A",
            "zed").atk < on,
        "mất hào quang khi Ornn chết")
    })
test("Ornn phe địch không buff đồ của mình",
    () => {
        const a = mk({
            A: {
                zed: 1
            }, B: {
                garen: 1
            }
        })
        equip(a,
            "A",
            "zed",
            ITEM)
        const b = mk({
            A: {
                zed: 1
            }, B: {
                garen: 1, ornn: 2
            }
        })
        equip(b,
            "A",
            "zed",
            ITEM)
        assert.equal(stat(b,
            "A",
            "zed").atk,
        stat(a,
            "A",
            "zed").atk)
    })
test("Kiệt Tác chỉ tăng chỉ số đồ, không nhân AD gốc",
    () => {
        const s = mk({
            A: {
                zed: 1, ornn: 2
            }
        })
        equip(s,
            "A",
            "zed",
            ITEM)
        const before = stat(s,
            "A",
            "zed").atk
        u(s,
            "A",
            "zed").stacks.itemAmp = 100
        const itemPart = addAD(ITEM) * (1 + P("ornn",
            "p1") / 100)
        near(stat(s,
            "A",
            "zed").atk - before,
        itemPart,
        "Kiệt Tác +100% chỉ cộng đúng phần đồ")
    })
test("Kiệt Tác không nhân hào quang Giáp của Malphite",
    () => {
        const s = mk({
            A: {
                zed: 1, ornn: 2, malphite: 3
            }
        })
        equip(s,
            "A",
            "zed",
            "ao_choang_gai")
        const base = stat(s,
            "A",
            "zed").armor
        u(s,
            "A",
            "zed").stacks.itemAmp = 100
        const item = cg.itemBalance("ao_choang_gai").stats.armor * (1 + P("ornn",
            "p1") / 100)
        near(stat(s,
            "A",
            "zed").armor - base,
        item,
        "chỉ phần Giáp đồ gấp đôi")
    })
test("Rabadon cộng dồn đúng với Ornn: % tổng AP tính sau hào quang",
    () => {
        const s = mk({
            A: {
                lux: 1, ornn: 2
            }
        })
        equip(s,
            "A",
            "lux",
            "mu_rabadon")
        const a = {
            a: cg.itemBalance("mu_rabadon").stats.ap, b: cg.itemBalance("mu_rabadon").p.b
        }
        near(stat(s,
            "A",
            "lux").ap,
        a.a * (1 + P("ornn",
            "p1") / 100) * (1 + a.b / 100),
        "AP Rabadon + Ornn")
    })

G("Hào quang chồng nhau")
test("Leona Giáp Mặt Trời không nhân hào quang Malphite",
    () => {
        const a = mk({
            A: {
                leona: 1
            }
        })
        const b = mk({
            A: {
                leona: 1, malphite: 3
            }
        })
        const own = gm(a).armor(u(a,
            "A",
            "leona"))
        const aura = gm(b).armor(u(b,
            "A",
            "malphite")) / (1 + P("malphite",
            "p1")) * P("malphite",
            "p1")
        near(gm(b).armor(u(b,
            "A",
            "leona")) - own,
        aura,
        "Leona chỉ cộng đúng phần hào quang")
    })
test("Nami Dậy Sóng tăng AP cả đội, Nami chết thì tắt phần AP",
    () => {
        const s = mk({
            A: {
                nami: 1, lux: 2
            }
        })
        u(s,
            "A",
            "nami").stacks.tide = 10
        const k = Object.keys(u(s,
            "A",
            "nami").stacks)[0]
        const on = stat(s,
            "A",
            "lux").ap
        gm(s).kill(u(s,
            "A",
            "nami"))
        assert.ok(stat(s,
            "A",
            "lux").ap <= on,
        k)
    })

G("Nội tại ăn nguồn của tướng khác")
test("Soraka Thánh Quang đếm cả hồi Máu từ nội tại Garen",
    () => {
        const s = mk({
            A: {
                soraka: 1, garen: 2
            }, B: {
                braum: 2
            }
        })
        u(s,
            "A",
            "garen").hp = 50
        const need = P("soraka",
            "p1")
        const before = JSON.stringify(u(s,
            "A",
            "soraka").stacks)
        const g = gm(s)
        g.heal(undefined,
            u(s,
                "A",
                "garen"),
            need + 1)
        assert.notEqual(JSON.stringify(u(s,
            "A",
            "soraka").stacks),
        before,
        "phe bạn được hồi thì tích Thánh Quang")
    })
test("Janna Gió Thuận đếm Khiên từ tướng khác và từ lá Lá Chắn",
    () => {
        const s = mk({
            A: {
                janna: 1, garen: 2
            }
        })
        const before = JSON.stringify(u(s,
            "A",
            "janna").stacks)
        gm(s).shield(undefined,
            u(s,
                "A",
                "garen"),
            P("janna",
                "p1") + 1)
        assert.notEqual(JSON.stringify(u(s,
            "A",
            "janna").stacks),
        before,
        "Khiên phe bạn tích Gió Thuận")
    })
test("Nami Dậy Sóng đếm sát thương của đồng minh",
    () => {
        const s = mk({
            A: {
                nami: 1, garen: 2
            }, B: {
                braum: 2
            }
        })
        const before = JSON.stringify(u(s,
            "A",
            "nami").stacks)
        const g = gm(s)
        g.damage(u(s,
            "A",
            "garen"),
        u(s,
            "B",
            "braum"),
        P("nami",
            "p1") * 3,
        "true",
        {
            tag: "attack"
        })
        assert.notEqual(JSON.stringify(u(s,
            "A",
            "nami").stacks),
        before)
    })
test("Viktor Tiến Hoá đếm lá phe mình bị Blitzcrank R bắt bỏ",
    () => {
        const s = mk({
            A: {
                blitzcrank: 1
            }, B: {
                viktor: 1
            }
        })
        const g = gm(s)
        s.players.B.hand.push(g.supportCard("gold"),
            g.supportCard("gold"),
            g.supportCard("gold"))
        const before = JSON.stringify(u(s,
            "B",
            "viktor").stacks)
        const r = cast(s,
            "A",
            skill(s,
                "blitzcrank",
                "A",
                "R"))
        assert.notEqual(JSON.stringify(u(r.s,
            "B",
            "viktor").stacks),
        before,
        "mọi cách bỏ đều tính")
    })
test("Kog'Maw được Đói khi đồng minh khác chết, Renata cứu thì không tính chết",
    () => {
        const s = mk({
            A: {
                kogmaw: 1, renata: 2, zed: 3
            }
        })
        const g = gm(s)
        const before = JSON.stringify(u(s,
            "A",
            "kogmaw").stacks)
        g.damage(undefined,
            u(s,
                "A",
                "zed"),
            99999,
            "true",
            {
                tag: "effect"
            })
        assert.equal(u(s,
            "A",
            "zed").status,
        "board",
        "Renata hồi sinh")
        assert.equal(JSON.stringify(u(s,
            "A",
            "kogmaw").stacks),
        before,
        "chết hụt không cho Đói")
    })
test("Renata cứu thì tướng không mất bộ đếm nửa như chết thật",
    () => {
        const s = mk({
            A: {
                vayne: 1, renata: 2
            }
        })
        u(s,
            "A",
            "vayne").stacks.vayne_night = 10
        const key = Object.keys(u(s,
            "A",
            "vayne").stacks).find((x) => /night|bong|vayne/.test(x))!
        gm(s).damage(undefined,
            u(s,
                "A",
                "vayne"),
            99999,
            "true",
            {
                tag: "effect"
            })
        assert.equal(u(s,
            "A",
            "vayne").stacks[key],
        10)
    })
test("Malphite Liên Kết chia sát thương, tướng nhận đủ phần vẫn được Renata cứu",
    () => {
        const s = mk({
            A: {
                malphite: 1, zed: 2, renata: 3
            }
        })
        const z = u(s,
                "A",
                "zed"), m = u(s,
                "A",
                "malphite")
        gm(s).status(z,
            "stone_link",
            99)
        gm(s).status(m,
            "stone_link",
            99)
        gm(s).damage(undefined,
            z,
            99999,
            "true",
            {
                tag: "effect"
            })
        assert.equal(u(s,
            "A",
            "zed").status,
        "board")
        assert.equal(u(s,
            "A",
            "malphite").status,
        "board")
    })
test("Vừa đánh vừa hết lượt không lỗi: nội tại đầu lượt của 10 tướng chạy cùng nhau",
    () => {
        const s = mk({
            A: {
                nami: 0, ornn: 1, kogmaw: 2, vayne: 3, gangplank: 4
            }, B: {
                katarina: 0, brand: 1, darius: 2, ashe: 3, twistedfate: 4
            }
        })
        let r = basic(s,
            "A",
            "A:kogmaw",
            "B:darius")
        r = endTurn(r.s)
        assert.equal(r.s.phase === "main" || r.s.phase === "summon" || r.s.phase === "chain" || r.s.phase === "blind",
            true)
    })

report()
