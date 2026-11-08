// Test đồ chế độ thẻ bài (bản chốt 01/11/2026, law.md 11d): 8 mảnh + 36 món, mỗi món 1 nội tại, số liệu đọc từ balance/items.json qua cg.itemBalance.
// Chạy: npx tsx scripts/card_tests_items.ts [--only=chuỗi] [--verbose]. Mọi số mong đợi tính từ cg.itemBalance(id), sửa JSON không làm vỡ test.
import assert from "node:assert/strict"
import {
    cg
} from "@starci/shared"
import {
    Game, G, mk, report, test, type St
} from "./kit_test_util"

const LEGENDS = [
    "kiem_tu_than",
    "sung_hextech",
    "cuong_dao",
    "vo_cuc_kiem",
    "ao_choang_bong_toi",
    "dao_tim",
    "sterak",
    "giao_shojin",
    "mu_rabadon",
    "nanh_nashor",
    "gang_bao_thach",
    "vuong_mien",
    "quy_thu",
    "mat_na_liandry",
    "truong_truong_sinh",
    "dai_bac",
    "diet_khong_lo",
    "tim_bang",
    "sat_thu_kraken",
    "y_chi_titan",
    "than_kiem_manamune",
    "ke_thu_thap",
    "giap_thien_than",
    "khan_giai_thuat",
    "tim_khong_than",
    "ban_dong_hanh_luden",
    "ao_choang_gai",
    "giap_gargoyle",
    "ao_choang_lua",
    "loi_the_ho_ve",
    "vuot_rong",
    "khien_hu_vo",
    "mu_thich_nghi",
    "giap_warmog",
    "day_chuyen_chuoc_toi",
    "bua_lam",
]
const PIECES = ["kiem_dai",
    "gay_qua_kho",
    "cung_go",
    "gang_tay",
    "giap_luoi",
    "ao_choang",
    "dai_khong_lo",
    "nuoc_mat"]
const CRIT_ITEMS = ["vo_cuc_kiem",
    "gang_bao_thach",
    "diet_khong_lo",
    "ke_thu_thap",
    "giap_thien_than",
    "khan_giai_thuat",
    "tim_khong_than",
    "ban_dong_hanh_luden"]
/** Bảng ghép của docs/heroes/ITEMS.md: [mảnh, mảnh, món] */
const RECIPES: [string, string, string][] = [
    ["kiem_dai",
        "kiem_dai",
        "kiem_tu_than"],
    ["kiem_dai",
        "gay_qua_kho",
        "sung_hextech"],
    ["kiem_dai",
        "cung_go",
        "cuong_dao"],
    ["kiem_dai",
        "gang_tay",
        "vo_cuc_kiem"],
    ["kiem_dai",
        "giap_luoi",
        "ao_choang_bong_toi"],
    ["kiem_dai",
        "ao_choang",
        "dao_tim"],
    ["kiem_dai",
        "dai_khong_lo",
        "sterak"],
    ["kiem_dai",
        "nuoc_mat",
        "giao_shojin"],
    ["gay_qua_kho",
        "gay_qua_kho",
        "mu_rabadon"],
    ["gay_qua_kho",
        "cung_go",
        "nanh_nashor"],
    ["gay_qua_kho",
        "gang_tay",
        "gang_bao_thach"],
    ["gay_qua_kho",
        "giap_luoi",
        "vuong_mien"],
    ["gay_qua_kho",
        "ao_choang",
        "quy_thu"],
    ["gay_qua_kho",
        "dai_khong_lo",
        "mat_na_liandry"],
    ["gay_qua_kho",
        "nuoc_mat",
        "truong_truong_sinh"],
    ["cung_go",
        "cung_go",
        "dai_bac"],
    ["cung_go",
        "gang_tay",
        "diet_khong_lo"],
    ["cung_go",
        "giap_luoi",
        "tim_bang"],
    ["cung_go",
        "ao_choang",
        "sat_thu_kraken"],
    ["cung_go",
        "dai_khong_lo",
        "y_chi_titan"],
    ["cung_go",
        "nuoc_mat",
        "than_kiem_manamune"],
    ["gang_tay",
        "gang_tay",
        "ke_thu_thap"],
    ["gang_tay",
        "giap_luoi",
        "giap_thien_than"],
    ["gang_tay",
        "ao_choang",
        "khan_giai_thuat"],
    ["gang_tay",
        "dai_khong_lo",
        "tim_khong_than"],
    ["gang_tay",
        "nuoc_mat",
        "ban_dong_hanh_luden"],
    ["giap_luoi",
        "giap_luoi",
        "ao_choang_gai"],
    ["giap_luoi",
        "ao_choang",
        "giap_gargoyle"],
    ["giap_luoi",
        "dai_khong_lo",
        "ao_choang_lua"],
    ["giap_luoi",
        "nuoc_mat",
        "loi_the_ho_ve"],
    ["ao_choang",
        "ao_choang",
        "vuot_rong"],
    ["ao_choang",
        "dai_khong_lo",
        "khien_hu_vo"],
    ["ao_choang",
        "nuoc_mat",
        "mu_thich_nghi"],
    ["dai_khong_lo",
        "dai_khong_lo",
        "giap_warmog"],
    ["dai_khong_lo",
        "nuoc_mat",
        "day_chuyen_chuoc_toi"],
    ["nuoc_mat",
        "nuoc_mat",
        "bua_lam"],
]
const bal = cg.itemBalance
const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps

/** A: Darius (đường 2) + Lux (đường 1); B: Garen (đường 2) + Ashe (đường 1); máu rất lớn */
function world(): St {
    const s = mk({
        A: {
            darius: 2, lux: 1
        }, B: {
            garen: 2, ashe: 1
        }
    })
    for (const x of Object.values(s.units)) if (x.status === "board") { x.maxHp = 100000; x.hp = 100000 }
    return s
}
type Ctx = { s: St; g: cg.Game; d: cg.Unit; lux: cg.Unit; t: cg.Unit; ashe: cg.Unit }
/** Dựng trận, cho Darius đeo `ids`; trả các tướng thường dùng */
function w(...ids: string[]): Ctx {
    const s = world()
    const g = new Game(s)
    const d = s.units["A:darius"]
    for (const id of ids) g.equip(d,
        id)
    d.hp = d.maxHp
    return {
        s, g, d, lux: s.units["A:lux"], t: s.units["B:garen"], ashe: s.units["B:ashe"]
    }
}
/** Ép mọi lần tung xúc xắc của g thành thành công / thất bại */
const always = (g: cg.Game) => { (g as unknown as { rand: () => number }).rand = () => 0 }
const never = (g: cg.Game) => { (g as unknown as { rand: () => number }).rand = () => 0.999 }
const tru = (g: cg.Game, src: cg.Unit | undefined, tgt: cg.Unit, raw: number, tag: "attack" | "skill" | "dot" | "effect" = "effect") => g.damage(src,
    tgt,
    raw,
    "true",
    {
        tag
    })
const casting = (g: cg.Game, unit: cg.Unit, card: string, uid: string) => { g.cur = {
    src: unit.id, card, uid
} }
const fakeCast = (g: cg.Game, caster: cg.Unit, key: cg.SkillKey = "Q") => g.hook("onCast",
    {
        caster, card: g.skillCard(caster.hero,
            caster.side,
            key), skill: g.hero(caster).skills[key], target: undefined
    })
const freeCards = (s: St, side: "A" | "B") => s.players[side].hand.filter((c) => c.temp && c.data?.free)
const keyOf = (c: cg.Card) => c.id.slice(-1).toUpperCase()
const dmgEv = (g: cg.Game) => g.events.filter((e): e is Extract<cg.GameEvent, { t: "damage" }> => e.t === "damage")

G("Đăng ký và số liệu")
test("Đủ 8 mảnh + 36 món, mỗi món có chữ VI/EN và số liệu JSON",
    () => {
        assert.equal(LEGENDS.length,
            36)
        assert.equal(Object.keys(cg.CARD_ITEMS).length,
            44)
        for (const id of [...PIECES,
            ...LEGENDS]) {
            assert.ok(cg.CARD_ITEMS[id],
                id)
            for (const lang of ["vi",
                "en"] as const) {
                const t = cg.itemText(id,
                    lang)!
                assert.ok(t.name && t.desc,
                    `${id} ${lang}`)
                if (LEGENDS.includes(id)) assert.ok(t.passive,
                    `${id} ${lang} passive`)
            }
        }
        for (const id of LEGENDS) assert.ok(bal(id),
            id)
        assert.deepEqual([...cg.LEGEND_ITEM_IDS].sort(),
            [...LEGENDS].sort())
    })
test("Bảng ghép đúng ITEMS.md",
    () => {
        for (const [a,
            b,
            r] of RECIPES) {
            assert.equal(cg.cardCombine(a,
                b),
            r,
            `${a}+${b}`)
            assert.equal(cg.cardCombine(b,
                a),
            r)
        }
        assert.equal(RECIPES.length,
            36)
    })
test("Chỉ số của món = stats trong JSON (Rabadon: AP nhân thêm b%)",
    () => {
        for (const id of LEGENDS) {
            const base = w()
            const before = base.g.stats(base.d)
            const hpBefore = base.d.maxHp
            const c = w(id)
            const after = c.g.stats(c.d)
            const st = bal(id).stats as Record<string, number>
            for (const k of ["atk",
                "ap",
                "armor",
                "mr",
                "crit",
                "attackSpeed"]) {
                let want = st[k] ?? 0
                if (id === "mu_rabadon" && k === "ap") want *= 1 + bal(id).p.b / 100
                assert.ok(near((after as unknown as Record<string, number>)[k] - (before as unknown as Record<string, number>)[k],
                    want,
                    1e-6),
                `${id} ${k}`)
            }
            assert.equal(c.d.maxHp - hpBefore,
                st.hp ?? 0,
                `${id} hp`)
        }
    })
test("Món chí mạng cho 50% chí mạng, mặc 2 món đủ 100%",
    () => {
        for (const id of CRIT_ITEMS) assert.equal(bal(id).stats.crit,
            0.5,
            id)
        const base = w()
        const c = w("vo_cuc_kiem",
            "ke_thu_thap")
        assert.ok(near(c.g.stats(c.d).crit - base.g.stats(base.d).crit,
            1))
    })
test("Không còn giảm mana chiêu, không còn Lời Thề bảo hộ / save Trượng",
    () => {
        for (const def of Object.values(cg.CARD_ITEMS)) {
            assert.ok(!("manaCostMod" in def),
                def.id)
            assert.ok(!("shareDamage" in def),
                def.id)
            assert.ok(!("maxMana" in def),
                def.id)
        }
        for (const id of [...PIECES,
            ...LEGENDS]) for (const lang of ["vi",
            "en"] as const) {
            const t = cg.itemText(id,
                lang)!
            assert.doesNotMatch(`${t.stats} ${t.desc}`,
                /tốn ít hơn|cost less|rẻ hơn|bảo hộ 1 đồng minh|mana tối đa|max mana/i,
                `${id} ${lang}`)
        }
        const x = cg as unknown as Record<string, unknown>
        assert.equal(x.vowOptions,
            undefined)
        assert.equal(x.setVowLink,
            undefined)
        assert.deepEqual(cg.RULES.lethalOrder,
            ["hero:renata",
                "transform",
                "item:giap_thien_than",
                "item:ao_choang_bong_toi"])
        assert.ok(!cg.RULES.lethalOrder.includes("item:truong_truong_sinh"))
        const c = w()
        assert.ok(!cg.legalActions(c.s,
            "A").some((a) => (a.t as string) === "vow"))
    })
test("Chữ VI/EN dựng từ cùng số JSON: mọi tham số nội tại xuất hiện trong chữ",
    () => {
        for (const id of LEGENDS) {
            const p = bal(id).p
            const probe = w()
            const params = (id === "cuong_dao" ? ["c",
                "d"] : Object.keys(JSON.parse(JSON.stringify(rawParams(id)))))
            void probe
            for (const k of params) {
                const v = (p as unknown as Record<string, number>)[k]
                for (const lang of ["vi",
                    "en"] as const) {
                    const desc = cg.itemText(id,
                        lang)!.desc
                    assert.ok(desc.includes(String(v).replace(".",
                        lang === "vi" ? "," : ".")),
                    `${id} ${lang} thiếu ${k}=${v}`)
                }
            }
        }
    })
function rawParams(id: string): Record<string, number> {
    // đọc tham số có trong JSON bằng cách thử từng tên (proxy ném lỗi nếu thiếu)
    const out: Record<string, number> = {
    }
    const p = bal(id).p as unknown as Record<string, number>
    for (const k of ["a",
        "b",
        "c",
        "d"]) { try { out[k] = p[k] } catch { /* không có */ } }
    return out
}
test("Tỉ lệ lá R miễn phí thấp hơn lá Q, E",
    () => {
        assert.ok(bal("giao_shojin").p.d < bal("giao_shojin").p.c)
        assert.ok(bal("truong_truong_sinh").p.c < bal("truong_truong_sinh").p.b)
        assert.ok(bal("bua_lam").p.c < bal("bua_lam").p.b)
    })

G("Lá miễn phí của đồ mana")
test("freeCard: lá tạm của tướng đeo, mana 0 (kể cả Lux R tiêu toàn bộ), tồn tại tới hết lượt đối phương",
    () => {
        const s = world()
        const g = new Game(s)
        const lux = s.units["A:lux"]
        for (const key of ["Q",
            "E",
            "R"] as const) {
            const card = cg.freeCard(g,
                lux,
                [key])!
            assert.ok(card.temp && card.hero === "lux" && keyOf(card) === key)
            assert.equal(g.manaCost(lux,
                g.hero(lux).skills[key],
                card),
            0,
            key)
            assert.equal(card.until,
                g.unitsUntil("A",
                    1))
            assert.ok(s.players.A.hand.some((c) => c.uid === card.uid))
        }
        // lá thường vẫn tốn mana, lá "all" của Lux vẫn tiêu toàn bộ
        const allDef = {
            ...g.hero(lux).skills.R, mana: "all" as const
        }
        assert.equal(g.manaCost(lux,
            allDef,
            g.skillCard("lux",
                "A",
                "R")),
        s.teamMana.A)
        assert.equal(g.manaCost(lux,
            allDef,
cg.freeCard(g,
    lux,
    ["R"])!),
        0)
    })
test("Lá miễn phí hết hạn cuối lượt đối phương",
    () => {
        const s = world()
        const g = new Game(s)
        const d = s.units["A:darius"]
        const card = cg.freeCard(g,
            d,
            ["Q"])!
        s.active = "B"; s.turnNo = card.until!
        g.expireTemps("B")
        assert.ok(!s.players.A.hand.some((c) => c.uid === card.uid))
    })

G("Hàng Kiếm")
test("Kiếm Tử Thần: chỉ có chỉ số, không nội tại",
    () => {
        const c = w("kiem_tu_than")
        assert.deepEqual(c.g.stats(c.d).atk - w().g.stats(w().d).atk,
            bal("kiem_tu_than").stats.atk)
        assert.equal(cg.CARD_ITEMS.kiem_tu_than.hooks,
            undefined)
    })
test("Kiếm Súng Hextech: hồi c% sát thương thực gây ra",
    () => {
        const { d, g, t } = w("sung_hextech")
        d.hp = 50000
        const dealt = tru(g,
            d,
            t,
            1000)
        assert.equal(d.hp,
            50000 + Math.round(dealt * bal("sung_hextech").p.c / 100))
        const hp = d.hp
        tru(g,
            t,
            d,
            500)
        assert.equal(d.hp,
            hp - 500,
            "chịu sát thương không hồi")
    })
test("Cuồng Đao: mỗi đòn trúng +c Tốc Đánh vĩnh viễn, tối đa d",
    () => {
        const { d, g, t } = w("cuong_dao")
        const p = bal("cuong_dao").p
        const as0 = g.stats(d).attackSpeed
        for (let i = 0; i < 3; i++) g.attack(d,
            t)
        assert.equal(d.stacks["item:cuong_dao"],
            3)
        assert.equal(g.stats(d).attackSpeed - as0,
            3 * p.c)
        for (let i = 0; i < p.d / p.c + 5; i++) g.attack(d,
            t)
        assert.equal(g.stats(d).attackSpeed - as0,
            p.d)
    })
test("Vô Cực Kiếm: đòn chí mạng bỏ qua b Giáp",
    () => {
        const { d, g, t } = w("vo_cuc_kiem")
        assert.equal(g.attack(d,
            t)!.critArmorPen,
        bal("vo_cuc_kiem").p.b)
    })
test("Áo Choàng Bóng Tối: sắp bị hạ giữ 1 máu, 1 lần mỗi trận",
    () => {
        const { d, g, t } = w("ao_choang_bong_toi")
        d.maxHp = 1000; d.hp = 100
        tru(g,
            t,
            d,
            5000)
        assert.equal(d.hp,
            1)
        assert.equal(d.status,
            "board")
        assert.equal(d.stacks["item:ao_choang_bong_toi"],
            0)
        assert.ok(!g.has(d,
            "invulnerable"),
        "chỉ có 1 nội tại: giữ 1 Máu")
        tru(g,
            t,
            d,
            5000)
        assert.notEqual(d.status === "board" && d.hp > 0,
            true,
            "lần hai không cứu")
    })
test("Đao Tím: máu tụt qua 50% nhận c Khiên phép, hồi chiêu d lượt",
    () => {
        const { s, d, g, t } = w("dao_tim")
        const p = bal("dao_tim").p
        d.maxHp = 1000; d.hp = 600
        tru(g,
            t,
            d,
            150)
        assert.equal(g.shieldOf(d,
            "magic"),
        p.c)
        d.shieldMagic = 0; d.shieldTimed = []; d.hp = 600
        tru(g,
            t,
            d,
            150)
        assert.equal(g.shieldOf(d,
            "magic"),
        0,
        "đang hồi chiêu")
        s.ownTurns = {
            A: p.d + 1, B: 0
        }
        d.hp = 600
        tru(g,
            t,
            d,
            150)
        assert.equal(g.shieldOf(d,
            "magic"),
        p.c)
    })
test("Sterak: mỗi 10% máu đã mất +c AD",
    () => {
        const { d, g, t } = w("sterak")
        const p = bal("sterak").p
        d.maxHp = 1000; d.hp = 1000
        const full = g.stats(d).atk
        tru(g,
            t,
            d,
            350)
        assert.equal(g.stats(d).atk - full,
            3 * p.c)
    })
test("Giáo Shojin: đòn trúng hồi b mana; c% lá Q/E và d% lá R miễn phí",
    () => {
        const { s, d, g, t } = w("giao_shojin")
        const p = bal("giao_shojin").p
        s.teamMana.A = 50
        never(g)
        g.attack(d,
            t)
        assert.equal(s.teamMana.A,
            50 + p.b)
        assert.equal(freeCards(s,
            "A").length,
        0)
        always(g)
        g.attack(d,
            t)
        const cards = freeCards(s,
            "A")
        assert.equal(cards.length,
            2)
        assert.ok(cards.some((c) => keyOf(c) === "R"))
        assert.ok(cards.some((c) => keyOf(c) === "Q" || keyOf(c) === "E"))
    })

G("Hàng Gậy")
test("Mũ Rabadon: tổng AP tăng b%",
    () => {
        const { d, g } = w("mu_rabadon",
            "gay_qua_kho")
        const a = bal("mu_rabadon")
        assert.ok(near(g.stats(d).ap,
            (a.stats.ap! + 30) * (1 + a.p.b / 100)))
    })
test("Nanh Nashor: đòn đánh thêm c% AP sát thương phép",
    () => {
        const { d, g, t } = w("nanh_nashor")
        const bonus = g.attack(d,
            t)!.bonus.filter((b) => b.kind === "magic")
        assert.equal(bonus.length,
            1)
        assert.ok(near(bonus[0].raw,
            bal("nanh_nashor").p.c / 100 * g.ap(d)))
    })
test("Găng Bảo Thạch: chiêu chí mạng được theo tỉ lệ chí mạng",
    () => {
        const hit = (roll: "always" | "never") => {
            const { d, g, t } = w("gang_bao_thach")
            if (roll === "always") always(g)
            else never(g)
            casting(g,
                d,
                "darius_q",
                "c10")
            return g.damage(d,
                t,
                1000,
                "true",
                {
                    tag: "skill"
                })
        }
        assert.equal(cg.CARD_ITEMS.gang_bao_thach.spellCritMult,
            cg.RULES.critBase)
        assert.ok(near(hit("always") / hit("never"),
            cg.RULES.critBase,
            0.01))
    })
test("Vương Miện: lá chiêu đầu mỗi lượt nhận c Khiên vật lý",
    () => {
        const { d, g } = w("vuong_mien")
        const c = bal("vuong_mien").p.c
        fakeCast(g,
            d)
        assert.equal(g.shieldOf(d,
            "physical"),
        c)
        fakeCast(g,
            d)
        assert.equal(g.shieldOf(d,
            "physical"),
        c,
        "chỉ lá đầu tiên")
    })
test("Quỷ Thư: chiêu gây sát thương gắn Vết Thương Sâu c đơn vị",
    () => {
        const { s, d, g, t } = w("quy_thu")
        tru(g,
            d,
            t,
            100,
            "effect")
        assert.ok(!g.has(t,
            "grievous"),
        "chỉ chiêu")
        tru(g,
            d,
            t,
            100,
            "skill")
        assert.ok(g.has(t,
            "grievous"))
        assert.equal(t.statuses.grievous.until,
            g.unitsUntil(d,
                bal("quy_thu").p.c))
        void s
    })
test("Liandry: chiêu đặt Tro Tàn, mỗi lượt của mục tiêu đốt c% máu tối đa trong d đơn vị",
    () => {
        const { d, g, t } = w("mat_na_liandry")
        const p = bal("mat_na_liandry").p
        tru(g,
            d,
            t,
            10,
            "skill")
        assert.equal(d.stacks[`itemT:ash:${t.id}`],
            p.d)
        const mr = 100 / (100 + g.mr(t))
        let ticks = 0
        for (let i = 0; i < p.d + 2; i++) {
            const n0 = dmgEv(g).length
            g.hook("onTurnStart",
                {
                    side: "B"
                })
            const ev = dmgEv(g).slice(n0).filter((e) => e.src === d.id && e.target === t.id)
            if (ev.length) { ticks++; assert.ok(near(ev[0].amount,
                Math.round(p.c / 100 * t.maxHp * mr),
                2)) }
        }
        assert.equal(ticks,
            p.d)
    })
test("Quyền Trượng Thiên Thần: dùng chiêu b% lá Q/E, c% lá R miễn phí",
    () => {
        const { s, d, g } = w("truong_truong_sinh")
        never(g)
        fakeCast(g,
            d)
        assert.equal(freeCards(s,
            "A").length,
        0)
        always(g)
        fakeCast(g,
            d)
        const cards = freeCards(s,
            "A")
        assert.equal(cards.length,
            2)
        assert.ok(cards.some((c) => keyOf(c) === "R"))
    })

G("Hàng Cung")
test("Đại Bác Liên Thanh: đòn đánh chọn được mọi tướng địch",
    () => {
        assert.equal(cg.hasAnyTarget(w("dai_bac").d),
            true)
        assert.equal(cg.hasAnyTarget(w().d),
            false)
    })
test("Diệt Khổng Lồ: thêm b% lên tướng nhiều máu hơn mình",
    () => {
        const { d, g, t } = w("diet_khong_lo")
        const b = bal("diet_khong_lo").p.b
        t.maxHp = 200000; t.hp = 200000
        assert.equal(tru(g,
            d,
            t,
            1000,
            "attack"),
        Math.round(1000 * (1 + b / 100)))
        t.maxHp = 1000; t.hp = 1000
        assert.equal(tru(g,
            d,
            t,
            1000,
            "attack") ,
        1000)
    })
test("Tim Băng: địch đối diện và 2 đường kề gây ít hơn c% sát thương đòn đánh",
    () => {
        const { d, g, t, lux } = w("tim_bang")
        const c = bal("tim_bang").p.c
        assert.equal(tru(g,
            t,
            lux,
            1000,
            "attack"),
        Math.round(1000 * (1 - c / 100)))
        assert.equal(tru(g,
            t,
            lux,
            1000,
            "skill"),
        1000,
        "chỉ đòn đánh")
        void d
    })
test("Móc Diệt Thủy Quái: đòn thứ 3 liên tiếp cùng tướng thêm c + d%AD chuẩn",
    () => {
        const { d, g, t } = w("sat_thu_kraken")
        const p = bal("sat_thu_kraken").p
        const tr = (i: cg.AttackInfo) => i.bonus.filter((b) => b.kind === "true")
        assert.equal(tr(g.attack(d,
            t)!).length,
        0)
        assert.equal(tr(g.attack(d,
            t)!).length,
        0)
        const third = tr(g.attack(d,
            t)!)
        assert.equal(third.length,
            1)
        assert.ok(near(third[0].raw,
            p.c + p.d / 100 * g.atk(d)))
        assert.equal(tr(g.attack(d,
            t)!).length,
        0)
    })
test("Rìu Đại Mãng Xà: đòn đánh thêm c% máu tối đa người đeo",
    () => {
        const { d, g, t } = w("y_chi_titan")
        const b = g.attack(d,
            t)!.bonus.filter((x) => x.kind === "physical")
        assert.equal(b.length,
            1)
        assert.ok(near(b[0].raw,
            bal("y_chi_titan").p.c / 100 * d.maxHp))
    })
test("Manamune: dùng chiêu thì đòn kế hồi c mana; d% lá Q/E miễn phí",
    () => {
        const { s, d, g, t } = w("than_kiem_manamune")
        const p = bal("than_kiem_manamune").p
        s.teamMana.A = 50
        g.attack(d,
            t)
        assert.equal(s.teamMana.A,
            50,
            "chưa dùng chiêu")
        never(g)
        fakeCast(g,
            d)
        assert.equal(freeCards(s,
            "A").length,
        0)
        g.attack(d,
            t)
        assert.equal(s.teamMana.A,
            50 + p.c)
        g.attack(d,
            t)
        assert.equal(s.teamMana.A,
            50 + p.c,
            "chỉ đòn kế")
        always(g)
        fakeCast(g,
            d)
        const cards = freeCards(s,
            "A")
        assert.equal(cards.length,
            1)
        assert.notEqual(keyOf(cards[0]),
            "R")
    })

G("Hàng Găng")
test("Súng Hải Tặc: càng ít máu mục tiêu đòn càng đau (tối đa b%)",
    () => {
        const { d, g, t } = w("ke_thu_thap")
        const b = bal("ke_thu_thap").p.b
        t.maxHp = 1000; t.hp = 1000
        assert.equal(tru(g,
            d,
            t,
            100,
            "attack"),
        100)
        t.hp = 500
        assert.equal(tru(g,
            d,
            t,
            100,
            "attack"),
        Math.round(100 * (1 + b / 100 * 0.5)))
    })
test("Giáp Thiên Thần: lần đầu bị hạ đứng dậy với b% máu, 1 lần mỗi trận",
    () => {
        const { d, g, t } = w("giap_thien_than")
        d.maxHp = 1000; d.hp = 100
        tru(g,
            t,
            d,
            5000)
        assert.equal(d.status,
            "board")
        assert.equal(d.hp,
            Math.round(bal("giap_thien_than").p.b / 100 * 1000))
        assert.equal(d.stacks["item:giap_thien_than"],
            0)
        tru(g,
            t,
            d,
            5000)
        assert.ok(d.hp <= 0 || d.status !== "board")
    })
test("Khăn Giải Thuật: huỷ khống chế đầu tiên, hồi b lượt",
    () => {
        const { s, d, g, t } = w("khan_giai_thuat")
        const b = bal("khan_giai_thuat").p.b
        g.status(d,
            "stun",
            1,
            {
                src: t.id
            })
        assert.ok(!g.has(d,
            "stun"))
        g.status(d,
            "blind",
            1,
            {
                src: t.id
            })
        assert.ok(g.has(d,
            "blind"),
        "đang hồi chiêu")
        delete d.statuses.blind
        s.ownTurns = {
            A: b + 1, B: 0
        }
        g.status(d,
            "blind",
            1,
            {
                src: t.id
            })
        assert.ok(!g.has(d,
            "blind"),
        "đã sẵn sàng lại")
    })
test("Trái Tim Khổng Thần: lần đầu mỗi lượt chí mạng +b máu tối đa vĩnh viễn (tối đa c lần)",
    () => {
        const { s, d, g, t } = w("tim_khong_than")
        const p = bal("tim_khong_than").p
        const base = d.maxHp
        const info = {
            attacker: d, target: t, raw: 1, mult: 1, kind: "physical", crit: true, miss: false, free: false, nth: 1, bonus: [], buffs: []
        } as unknown as cg.AttackInfo
        g.hook("onCrit",
            {
                attacker: d, target: t, info
            })
        assert.equal(d.maxHp - base,
            p.b)
        g.hook("onCrit",
            {
                attacker: d, target: t, info
            })
        assert.equal(d.maxHp - base,
            p.b,
            "1 lần mỗi lượt")
        s.turnNo += 2
        g.hook("onCrit",
            {
                attacker: d, target: t, info
            })
        assert.equal(d.maxHp - base,
            2 * p.b)
        for (let i = 0; i < 12; i++) { s.turnNo += 2; g.hook("onCrit",
            {
                attacker: d, target: t, info
            }) }
        assert.equal(d.maxHp - base,
            14 * p.b,
            "không có trần: vĩnh viễn, vô hạn")
    })
test("Vọng Âm Luden: đòn chí mạng hồi c mana, b% lá Q/E miễn phí",
    () => {
        const { s, d, g, t } = w("ban_dong_hanh_luden")
        const p = bal("ban_dong_hanh_luden").p
        const info = {
            attacker: d, target: t, raw: 1, mult: 1, kind: "physical", crit: true, miss: false, free: false, nth: 1, bonus: [], buffs: []
        } as unknown as cg.AttackInfo
        s.teamMana.A = 50
        never(g)
        g.hook("onCrit",
            {
                attacker: d, target: t, info
            })
        assert.equal(s.teamMana.A,
            50 + p.c)
        assert.equal(freeCards(s,
            "A").length,
        0)
        always(g)
        g.hook("onCrit",
            {
                attacker: d, target: t, info
            })
        assert.equal(freeCards(s,
            "A").length,
        1)
        assert.equal(cg.CARD_ITEMS.ban_dong_hanh_luden.spellCritMult,
            undefined)
    })

G("Hàng Giáp")
test("Giáp Gai: kẻ đánh nhận b + c% Giáp sát thuật phép",
    () => {
        const { d, g, t } = w("ao_choang_gai")
        const p = bal("ao_choang_gai").p
        g.attack(t,
            d)
        const ev = dmgEv(g).filter((e) => e.src === d.id && e.target === t.id && e.kind === "magic")
        assert.equal(ev.length,
            1)
        assert.ok(near(ev[0].amount,
            Math.round((p.b + p.c / 100 * g.armor(d)) * 100 / (100 + g.mr(t))),
            1))
    })
test("Thú Tượng Thạch Giáp: mỗi tướng địch khác nhau gây sát thương +c Giáp và Kháng tới hết lượt",
    () => {
        const { s, d, g, t, ashe } = w("giap_gargoyle")
        const c = bal("giap_gargoyle").p.c
        const a0 = g.armor(d), m0 = g.mr(d)
        tru(g,
            t,
            d,
            10)
        tru(g,
            t,
            d,
            10)
        assert.equal(g.armor(d) - a0,
            c,
            "cùng một tướng chỉ tính một lần")
        tru(g,
            ashe,
            d,
            10)
        assert.equal(g.armor(d) - a0,
            2 * c)
        assert.equal(g.mr(d) - m0,
            2 * c)
        s.turnNo += 1
        assert.equal(g.armor(d),
            a0,
            "hết lượt")
    })
test("Áo Choàng Lửa: đầu lượt địch đối diện và 2 đường kề nhận c% máu tối đa của người đeo",
    () => {
        const { d, g, t, ashe } = w("ao_choang_lua")
        const c = bal("ao_choang_lua").p.c
        const hp0 = [t.hp,
            ashe.hp]
        g.hook("onTurnStart",
            {
                side: "B"
            })
        assert.equal(t.hp,
            hp0[0],
            "chỉ lượt của người đeo")
        g.hook("onTurnStart",
            {
                side: "A"
            })
        const exp = Math.round(c / 100 * d.maxHp * 100 / (100 + g.mr(t)))
        assert.ok(near(hp0[0] - t.hp,
            exp,
            2))
        assert.ok(near(hp0[1] - ashe.hp,
            Math.round(c / 100 * d.maxHp * 100 / (100 + g.mr(ashe))),
            2))
    })
test("Lời Thề Hiệp Sĩ (loi_the_ho_ve): đầu lượt +b mana; c% lá Q/E miễn phí",
    () => {
        const { s, g } = w("loi_the_ho_ve")
        const p = bal("loi_the_ho_ve").p
        s.teamMana.A = 50
        never(g)
        g.hook("onTurnStart",
            {
                side: "A"
            })
        assert.equal(s.teamMana.A,
            50 + p.b)
        assert.equal(freeCards(s,
            "A").length,
        0)
        g.hook("onTurnStart",
            {
                side: "B"
            })
        assert.equal(s.teamMana.A,
            50 + p.b,
            "chỉ lượt của bạn")
        always(g)
        g.hook("onTurnStart",
            {
                side: "A"
            })
        const cards = freeCards(s,
            "A")
        assert.equal(cards.length,
            1)
        assert.notEqual(keyOf(cards[0]),
            "R")
    })

G("Hàng Áo Choàng, Đai, Nước Mắt")
test("Vuốt Rồng: cuối lượt của bạn hồi b% máu tối đa",
    () => {
        const { d, g } = w("vuot_rong")
        d.hp = 50000
        g.hook("onTurnEnd",
            {
                side: "B"
            })
        assert.equal(d.hp,
            50000)
        g.hook("onTurnEnd",
            {
                side: "A"
            })
        assert.equal(d.hp,
            50000 + Math.round(bal("vuot_rong").p.b / 100 * d.maxHp))
    })
test("Giáp Vai Nguyệt Thần: địch đối diện nhận thêm c% từ đồng minh khác",
    () => {
        const { d, g, t, lux, ashe } = w("khien_hu_vo")
        const c = bal("khien_hu_vo").p.c
        assert.equal(tru(g,
            lux,
            t,
            1000,
            "skill"),
        Math.round(1000 * (1 + c / 100)))
        assert.equal(tru(g,
            d,
            t,
            1000,
            "skill"),
        1000,
        "không tính chính người đeo")
        assert.equal(tru(g,
            lux,
            ashe,
            1000,
            "skill"),
        1000,
        "không phải đối diện")
    })
test("Mũ Thích Nghi: chịu chiêu địch hồi b mana; c% lá Quick miễn phí",
    () => {
        const s = world()
        const g = new Game(s)
        const garen = s.units["B:garen"], d = s.units["A:darius"]
        g.equip(garen,
            "mu_thich_nghi")
        const p = bal("mu_thich_nghi").p
        s.teamMana.B = 50
        const card = g.skillCard("darius",
            "A",
            "Q")
        const skill = g.hero(d).skills.Q
        never(g)
        g.hook("onTargeted",
            {
                src: d, card, skill, affected: [garen.id], immune: []
            })
        assert.equal(s.teamMana.B,
            50 + p.b)
        assert.equal(freeCards(s,
            "B").length,
        0)
        g.hook("onTargeted",
            {
                src: d, card, skill, affected: [s.units["B:ashe"].id], immune: []
            })
        assert.equal(s.teamMana.B,
            50 + p.b,
            "chỉ khi bản thân chịu chiêu")
        always(g)
        g.hook("onTargeted",
            {
                src: d, card, skill, affected: [garen.id], immune: []
            })
        const cards = freeCards(s,
            "B")
        assert.equal(cards.length,
            1)
        assert.ok(g.hero(garen).skills[keyOf(cards[0]) as cg.SkillKey].quick,
            "là lá Quick")
    })
test("Giáp Máu Warmog: đầu lượt, không mất máu lượt địch vừa rồi thì hồi b% máu tối đa",
    () => {
        const { s, d, g } = w("giap_warmog")
        const b = bal("giap_warmog").p.b
        d.hp = 50000
        d.stacks["itemT:warmog:lost"] = s.turnNo - 1
        g.hook("onTurnStart",
            {
                side: "A"
            })
        assert.equal(d.hp,
            50000,
            "có mất máu")
        delete d.stacks["itemT:warmog:lost"]
        g.hook("onTurnStart",
            {
                side: "A"
            })
        assert.equal(d.hp,
            50000 + Math.round(b / 100 * d.maxHp))
    })
test("Dây Chuyền Chuộc Tội: chiêu hồi máu hoặc Khiên đồng minh hồi b mana, c% lá Q/E (1 lần mỗi lá)",
    () => {
        const { s, d, g, lux } = w("day_chuyen_chuoc_toi")
        const p = bal("day_chuyen_chuoc_toi").p
        lux.hp = 50000
        s.teamMana.A = 50
        never(g)
        tru(g,
            undefined,
            lux,
            0)
        g.heal(d,
            lux,
            100)
        assert.equal(s.teamMana.A,
            50,
            "không có lá nào đang giải quyết")
        casting(g,
            d,
            "darius_q",
            "c20")
        g.heal(d,
            lux,
            100)
        assert.equal(s.teamMana.A,
            50 + p.b)
        g.shield(d,
            lux,
            100)
        assert.equal(s.teamMana.A,
            50 + p.b,
            "cùng một lá chỉ một lần")
        casting(g,
            d,
            "darius_e",
            "c21")
        always(g)
        g.shield(d,
            lux,
            100)
        assert.equal(s.teamMana.A,
            50 + 2 * p.b)
        assert.equal(freeCards(s,
            "A").length,
        1)
        casting(g,
            d,
            "item:vuot_rong",
            "c22")
        g.heal(d,
            lux,
            100)
        assert.equal(s.teamMana.A,
            50 + 2 * p.b,
            "proc của đồ không tính")
    })
test("Bùa Xanh: hồi mana đội mỗi lượt; đầu lượt b% lá Q/E, c% lá R miễn phí",
    () => {
        const { s, g } = w("bua_lam")
        const regen = (bal("bua_lam").stats as Record<string, number>).manaRegen
        assert.equal(g.teamManaRegen("A"),
            cg.RULES.teamManaRegen + regen)
        never(g)
        g.hook("onTurnStart",
            {
                side: "A"
            })
        assert.equal(freeCards(s,
            "A").length,
        0)
        always(g)
        g.hook("onTurnStart",
            {
                side: "A"
            })
        const cards = freeCards(s,
            "A")
        assert.equal(cards.length,
            2)
        assert.ok(cards.some((c) => keyOf(c) === "R"))
    })

report()
