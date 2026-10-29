// Test đồ chế độ thẻ bài V2 (docs/ITEMS_V2.md): 8 mảnh, 36 món, bảng ghép 8x8, chỉ số, nội tại, bộ đếm, chữ hiển thị.
// Chạy: npx tsx scripts/card_tests_items.ts [--only=chuỗi] [--verbose]. Khung test chép từ scripts/card_tests.ts.
import assert from "node:assert/strict"
import {
    cg
} from "@starci/shared"

type St = ReturnType<typeof cg.newGame>;
type S = "A" | "B";
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

// A có Darius (đường 2) + Lux (đường 1); B có Garen (đường 2) + Ashe (đường 1); máu rất lớn để không ai chết ngoài ý muốn
const SEED = 20260505
function mk(): St {
    const s = cg.newGame(SEED,
        ["darius",
            "lux",
            "annie",
            "braum",
            "jinx"],
        ["garen",
            "ashe",
            "annie",
            "braum",
            "jinx"])
    s.round = 8
    const g = new Game(s)
    g.summon("A",
        "darius",
        2)
    g.summon("A",
        "lux",
        1)
    g.summon("B",
        "garen",
        2)
    g.summon("B",
        "ashe",
        1)
    s.players.A.hand = []
    s.players.B.hand = []
    s.phase = "main"; s.opened = {
        A: true, B: true
    }
    s.firstTurnDone = {
        A: true, B: true
    }
    s.active = "A"
    for (const x of Object.values(s.units)) if (x.status === "board") { x.maxHp = 100000; x.hp = 100000 }
    return s
}
const u = (s: St, side: S, hero: string) => s.units[`${side}:${hero}`]
const equip = (s: St, unit: cg.Unit, ...ids: string[]) => { const g = new Game(s); for (const id of ids) g.equip(unit,
    id); return g }
const cnt = (unit: cg.Unit, id: string) => unit.stacks[`item:${id}`]
/** Sát thương thật (kind "true") từ src lên tgt, trả về tổng đã gây */
const hit = (g: cg.Game, src: cg.Unit | undefined, tgt: cg.Unit, raw: number, tag: "attack" | "skill" | "dot" | "effect" = "effect") => g.damage(src,
    tgt,
    raw,
    "true",
    {
        tag
    })
type DmgEv = Extract<cg.GameEvent, { t: "damage" }>
const dmgEvents = (g: cg.Game) => g.events.filter((e): e is DmgEv => e.t === "damage")

const LEGENDS = [
    "kiem_tu_than",
    "vo_cuc_kiem",
    "sat_thu_kraken",
    "huyet_kiem",
    "loi_nhac_tu_vong",
    "diet_khong_lo",
    "dai_bac",
    "ke_thu_thap",
    "ao_choang_bong_toi",
    "sung_hextech",
    "sterak",
    "giao_shojin",
    "y_chi_titan",
    "cuong_dao",
    "tim_khong_than",
    "mu_rabadon",
    "bua_lam",
    "truong_truong_sinh",
    "ban_dong_hanh_luden",
    "than_kiem_manamune",
    "mat_na_liandry",
    "quy_thu",
    "gang_bao_thach",
    "vuong_mien",
    "giap_warmog",
    "giap_gargoyle",
    "ao_choang_gai",
    "tim_bang",
    "ao_choang_lua",
    "khien_hu_vo",
    "khan_giai_thuat",
    "giap_thien_than",
    "day_chuyen_chuoc_toi",
    "vuot_rong",
    "loi_the_ho_ve",
    "mu_thich_nghi",
]
const PIECES = ["kiem_dai",
    "gay_qua_kho",
    "cung_go",
    "gang_tay",
    "giap_luoi",
    "ao_choang",
    "dai_khong_lo",
    "nuoc_mat"]

G("Đăng ký")
test("Đủ 8 mảnh + 36 món huyền thoại, mỗi món có chữ VI/EN",
    () => {
        const ids = Object.keys(cg.CARD_ITEMS)
        assert.equal(ids.length,
            44)
        assert.equal(LEGENDS.length,
            36)
        for (const id of [...PIECES,
            ...LEGENDS]) {
            assert.ok(cg.CARD_ITEMS[id],
                id)
            for (const lang of ["vi",
                "en"] as const) {
                const t = cg.itemText(id,
                    lang)!
                assert.ok(t.name && t.stats && t.desc,
                    `${id} ${lang}`)
                if (LEGENDS.includes(id)) assert.ok(t.passive,
                    `${id} ${lang} passive`)
            }
        }
        assert.deepEqual([...cg.LEGEND_ITEM_IDS].sort(),
            [...LEGENDS].sort())
    })
test("cg.COMPONENTS khớp 8 mảnh trong bảng ghép",
    () => {
        assert.deepEqual([...cg.COMPONENTS].sort(),
            [...PIECES].sort())
    })
test("Chỉ 3 món có bộ đếm hiện",
    () => {
        assert.deepEqual(Object.values(cg.CARD_ITEMS).filter((d) => d.stack).map((d) => d.id).sort(),
            ["giap_thien_than",
                "tim_khong_than",
                "vuong_mien"])
        assert.equal(cg.itemText("tim_khong_than",
            "en")!.counter?.max,
        10)
        assert.equal(cg.itemText("vuot_rong",
            "vi")!.counter,
        undefined)
    })
test("Chữ mảnh và dòng chỉ số",
    () => {
        assert.match(cg.itemText("kiem_dai",
            "vi")!.desc,
        /Đeo riêng/)
        assert.match(cg.itemText("gang_tay",
            "en")!.stats,
        /15% Crit chance/)
        assert.match(cg.itemText("nuoc_mat",
            "vi")!.stats,
        /\+10% sát thương chiêu, \+20 mana tối đa/)
        assert.match(cg.itemText("truong_truong_sinh",
            "en")!.stats,
        /\+40 max mana/)
        assert.match(cg.itemText("cuong_dao",
            "en")!.stats,
        /45 adaptive AD\/AP/)
    })
test("Công thức {…} đã tính theo tướng đeo",
    () => {
        const s = mk()
        const d = u(s,
            "A",
            "darius")
        const g = equip(s,
            d,
            "ao_choang_gai")
        const t = cg.itemText("ao_choang_gai",
            "vi",
            g,
            d)!
        assert.match(t.desc,
            /\d+ \(20 \+ 40% Giáp\)/)
    })

G("Bảng ghép 8x8")
test("Mỗi cặp mảnh (36 cặp) ra đúng 1 món, 36 món khác nhau",
    () => {
        const seen = new Set<string>()
        for (let i = 0; i < 8; i++) for (let j = i; j < 8; j++) {
            const r = cg.cardCombine(PIECES[i],
                PIECES[j])
            assert.ok(r && cg.CARD_ITEMS[r],
                `${PIECES[i]}+${PIECES[j]}`)
            assert.equal(cg.cardCombine(PIECES[j],
                PIECES[i]),
            r)
            seen.add(r!)
        }
        assert.equal(seen.size,
            36)
    })
test("Các công thức đổi/mới đúng bảng ITEMS_V2",
    () => {
        const exp: [string, string, string][] = [["cung_go",
            "giap_luoi",
            "tim_bang"],
        ["cung_go",
            "dai_khong_lo",
            "y_chi_titan"],
        ["cung_go",
            "ao_choang",
            "sat_thu_kraken"],
        ["cung_go",
            "nuoc_mat",
            "than_kiem_manamune"],
        ["gang_tay",
            "gang_tay",
            "ke_thu_thap"],
        ["gang_tay",
            "dai_khong_lo",
            "tim_khong_than"],
        ["gang_tay",
            "nuoc_mat",
            "ban_dong_hanh_luden"],
        ["kiem_dai",
            "nuoc_mat",
            "giao_shojin"],
        ["nuoc_mat",
            "nuoc_mat",
            "bua_lam"]]
        for (const [a,
            b,
            r] of exp) assert.equal(cg.cardCombine(a,
            b),
        r)
        assert.equal(cg.cardCombine("kiem_dai",
            "khong_co"),
        undefined)
        assert.deepEqual(cg.cardRecipeOf("tim_bang")!.sort(),
            ["cung_go",
                "giap_luoi"])
    })

G("Mảnh")
test("Mảnh đeo riêng: chỉ số ~+20%, Nước Mắt thêm mana tối đa cho pháp sư",
    () => {
        const s = mk()
        const d = u(s,
            "A",
            "darius")
        const lux = u(s,
            "A",
            "lux")
        const g = new Game(s)
        const base = g.maxMana(lux)
        g.equip(d,
            "kiem_dai")
        assert.equal(g.stats(d).atk,
            15)
        g.equip(lux,
            "nuoc_mat")
        assert.equal(g.maxMana(lux),
            base + 20)
        assert.ok(Math.abs(g.stats(lux).spellAmp - 0.1) < 1e-9)
        g.equip(d,
            "nuoc_mat")
        assert.equal(g.maxMana(d),
            0)
    })
test("Ghép tại chỗ: mảnh thành món, chỉ số đổi theo món",
    () => {
        const s = mk()
        const d = u(s,
            "A",
            "darius")
        const g = equip(s,
            d,
            "kiem_dai")
        assert.ok(g.upgradeItem(d,
            "kiem_dai",
            cg.cardCombine("kiem_dai",
                "kiem_dai")!))
        assert.deepEqual(d.items,
            ["kiem_tu_than"])
        assert.equal(g.stats(d).atk,
            75)
    })

G("Chỉ số")
test("Mỗi bản sao cộng chỉ số riêng; Kiếm Tử Thần +75 AD",
    () => {
        const s = mk()
        const d = u(s,
            "A",
            "darius")
        const g = equip(s,
            d,
            "kiem_tu_than",
            "kiem_tu_than")
        assert.equal(g.stats(d).atk,
            150)
    })
test("Đồ ở lại sau khi chết",
    () => {
        const s = mk()
        const d = u(s,
            "A",
            "darius")
        const g = equip(s,
            d,
            "giap_warmog")
        g.kill(d,
            u(s,
                "B",
                "garen"))
        assert.deepEqual(d.items,
            ["giap_warmog"])
    })
test("Món thuần chỉ số: Warmog +400 Máu, Gargoyle +100 Máu +55 Giáp +55 KP",
    () => {
        const s = mk()
        const d = u(s,
            "A",
            "darius")
        const g = equip(s,
            d,
            "giap_warmog",
            "giap_gargoyle")
        const st = g.stats(d)
        assert.equal(st.hp,
            500)
        assert.equal(st.armor,
            55)
        assert.equal(st.mr,
            55)
    })
test("Vô Cực Kiếm: +25% chí mạng, chí mạng ×2,25",
    () => {
        const s = mk()
        const d = u(s,
            "A",
            "darius")
        const g = equip(s,
            d,
            "vo_cuc_kiem")
        const st = g.stats(d)
        assert.equal(st.atk,
            30)
        assert.ok(Math.abs(st.crit - 0.25) < 1e-9)
        assert.ok(Math.abs(cg.RULES.critBase + st.critDmg - 2.25) < 1e-9)
    })
test("Rabadon: tổng AP +30%",
    () => {
        const s = mk()
        const d = u(s,
            "A",
            "darius")
        const g = equip(s,
            d,
            "mu_rabadon")
        assert.equal(g.stats(d).ap,
            91)
    })
test("Cuồng Đao: +45 thích ứng (Darius vật lý = AD, Lux phép = AP)",
    () => {
        const s = mk()
        const d = u(s,
            "A",
            "darius")
        const lux = u(s,
            "A",
            "lux")
        const g = new Game(s)
        const luxAp = g.stats(lux).ap
        g.equip(d,
            "cuong_dao")
        g.equip(lux,
            "cuong_dao")
        assert.equal(g.stats(d).atk,
            45)
        assert.equal(g.stats(d).ap,
            0)
        assert.equal(g.stats(lux).ap,
            luxAp + 45)
    })

G("Đòn đánh")
test("Sát Thủ Kraken: đòn 1/2/3 trong lượt nhân 1 / 1,25 / 1,5",
    () => {
        const s = mk()
        const d = u(s,
            "A",
            "darius")
        const g = equip(s,
            d,
            "sat_thu_kraken")
        const t = u(s,
            "B",
            "garen")
        const m = [1,
            2,
            3,
            4].map(() => g.attack(d,
                t)!.mult)
        assert.deepEqual(m,
            [1,
                1.25,
                1.5,
                1.5])
    })
test("Huyết Kiếm: hút 35% sát thương; máu dư thành Khiên tối đa 25% máu tối đa",
    () => {
        const s = mk()
        const d = u(s,
            "A",
            "darius")
        const g = equip(s,
            d,
            "huyet_kiem")
        d.maxHp = 1000; d.hp = 500; d.shield = 0
        const t = u(s,
            "B",
            "garen")
        const info = g.attack(d,
            t)!
        assert.ok(info && !info.miss)
        assert.ok(d.hp > 500,
            "phải hồi máu")
        d.hp = d.maxHp; d.shield = 0
        for (let i = 0; i < 30; i++) g.attack(d,
            t)
        assert.ok(d.shield > 0,
            "máu đầy: dư thành Khiên")
        assert.ok(d.shield <= 0.25 * d.maxHp + 1,
            `Khiên ${d.shield}`)
    })
test("Lời Nhắc Tử Vong: địch trúng sát thương bị noheal; chặn hồi và Khiên",
    () => {
        const s = mk()
        const d = u(s,
            "A",
            "darius")
        const g = equip(s,
            d,
            "loi_nhac_tu_vong")
        const t = u(s,
            "B",
            "garen")
        hit(g,
            d,
            t,
            100,
            "attack")
        assert.ok(g.has(t,
            "noheal"))
        t.hp = 500; t.shield = 0
        assert.equal(g.heal(t,
            t,
            100),
        0)
        g.shield(t,
            t,
            100)
        assert.equal(t.shield,
            0)
    })
test("Diệt Khổng Lồ: +40% sát thương lên địch máu tối đa cao hơn",
    () => {
        const s = mk()
        const d = u(s,
            "A",
            "darius")
        const g = new Game(s)
        const t = u(s,
            "B",
            "garen")
        d.maxHp = 1000; d.hp = 1000
        const before = hit(g,
            d,
            t,
            1000)
        g.equip(d,
            "diet_khong_lo")
        const after = hit(g,
            d,
            t,
            1000)
        assert.equal(after,
            Math.round(before * 1.4))
        t.maxHp = 100; t.hp = 100
        assert.equal(hit(g,
            d,
            t,
            50),
        50)
    })
test("Đại Bác Liên Thanh: anyTarget + 60% sát thương đòn đánh",
    () => {
        const s = mk()
        const d = u(s,
            "A",
            "darius")
        const g = equip(s,
            d,
            "dai_bac")
        assert.ok(cg.hasAnyTarget(d))
        assert.ok(Math.abs(g.stats(d).extraAtk - 0.6) < 1e-9)
    })
test("Kẻ Thu Thập: địch còn dưới 15% máu tối đa bị hạ luôn",
    () => {
        const s = mk()
        const d = u(s,
            "A",
            "darius")
        const g = equip(s,
            d,
            "ke_thu_thap")
        const t = u(s,
            "B",
            "ashe")
        t.maxHp = 1000; t.hp = 200
        hit(g,
            d,
            t,
            20,
            "attack")
        assert.equal(t.status,
            "board")
        t.hp = 160
        hit(g,
            d,
            t,
            20,
            "attack")
        assert.equal(t.status,
            "dead")
    })
test("Áo Choàng Bóng Tối: hạ gục tướng địch -> không thể bị chọn (stealth)",
    () => {
        const s = mk()
        const d = u(s,
            "A",
            "darius")
        const g = equip(s,
            d,
            "ao_choang_bong_toi")
        g.kill(u(s,
            "B",
            "ashe"),
        d)
        assert.ok(g.has(d,
            "stealth"))
        assert.equal(d.statuses.stealth.until,
            s.turnNo + 1)
    })
test("Súng Hextech: chiêu gây sát thương -> thêm 80% AD vật lý, 1 lần mỗi mục tiêu mỗi lá",
    () => {
        const s = mk()
        const d = u(s,
            "A",
            "darius")
        const g = equip(s,
            d,
            "sung_hextech")
        const t = u(s,
            "B",
            "garen")
        g.cur = {
            src: d.id, card: "darius_q", uid: "c900"
        }
        const n0 = dmgEvents(g).length
        hit(g,
            d,
            t,
            10,
            "skill")
        hit(g,
            d,
            t,
            10,
            "skill")
        const ev = dmgEvents(g).slice(n0)
        const extra = ev.filter((e) => e.tag === "effect" && e.kind === "physical")
        assert.equal(extra.length,
            1)
        assert.ok(extra[0].amount > 0)
        g.cur = {
            src: d.id, card: "darius_e", uid: "c901"
        }
        const n1 = dmgEvents(g).length
        hit(g,
            d,
            t,
            10,
            "skill")
        assert.equal(dmgEvents(g).slice(n1).filter((e) => e.kind === "physical").length,
            1)
    })

G("Đấu sĩ và Quick")
test("Sterak: lần đầu mỗi lượt tụt xuống dưới 40% nhận Khiên 35% máu tối đa",
    () => {
        const s = mk()
        const d = u(s,
            "A",
            "darius")
        const g = equip(s,
            d,
            "sterak")
        d.maxHp = 1000; d.hp = 450; d.shield = 0
        const mx = d.maxHp
        hit(g,
            u(s,
                "B",
                "garen"),
            d,
            100)
        assert.equal(d.shield,
            Math.round(0.35 * mx))
        const sh = d.shield
        d.hp = 450
        hit(g,
            u(s,
                "B",
                "garen"),
            d,
            100)
        assert.ok(d.shield <= sh,
            "lần 2 cùng lượt không nhận thêm")
    })
test("Ngọn Giáo Shojin: gấp đôi sát thương đòn/chiêu trong lượt địch",
    () => {
        const s = mk()
        const d = u(s,
            "A",
            "darius")
        const g = equip(s,
            d,
            "giao_shojin")
        const t = u(s,
            "B",
            "garen")
        s.active = "A"
        assert.equal(hit(g,
            d,
            t,
            1000,
            "attack"),
        1000)
        s.active = "B"
        assert.equal(hit(g,
            d,
            t,
            1000,
            "attack"),
        2000)
        assert.equal(hit(g,
            d,
            t,
            1000,
            "skill"),
        2000)
        assert.equal(hit(g,
            d,
            t,
            1000,
            "effect"),
        1000)
    })
test("Ý Chí Titan: đòn đánh gây thêm 5% máu tối đa sát thương vật lý",
    () => {
        const s = mk()
        const d = u(s,
            "A",
            "darius")
        const g = equip(s,
            d,
            "y_chi_titan")
        const t = u(s,
            "B",
            "garen")
        const info = g.attack(d,
            t)!
        assert.ok(info.bonus.some((b) => b.kind === "physical" && Math.abs(b.raw - 0.05 * d.maxHp) < 1e-6))
    })
test("Cuồng Đao: mỗi lần tướng đeo cộng dồn riêng được cộng thêm 1",
    () => {
        const s = mk()
        const d = u(s,
            "A",
            "darius")
        const g = equip(s,
            d,
            "cuong_dao")
        const t = u(s,
            "B",
            "garen")
        g.cur = {
            src: d.id, card: "darius_q"
        }
        g.stack(t,
            "bleed",
            1)
        assert.equal(g.stackOf(t,
            "bleed"),
        2)
        g.cur = {
            src: t.id, card: "garen_q"
        }
        g.stack(t,
            "x",
            1)
        assert.equal(g.stackOf(t,
            "x"),
        1)
        g.cur = {
            src: d.id
        }
        g.status(t,
            "mark",
            2,
            {
                add: true, v: 1
            })
        assert.equal(g.statusV(t,
            "mark"),
        2)
    })
test("Tim Khổng Thần: đầu lượt của bạn +40 máu tối đa (tối đa +400, giữ qua chết)",
    () => {
        const s = mk()
        const d = u(s,
            "A",
            "darius")
        const g = equip(s,
            d,
            "tim_khong_than")
        const m0 = d.maxHp
        assert.equal(cnt(d,
            "tim_khong_than"),
        0)
        g.hook("onTurnStart",
            {
                side: "B"
            })
        assert.equal(d.maxHp,
            m0)
        g.hook("onTurnStart",
            {
                side: "A"
            })
        assert.equal(d.maxHp,
            m0 + 40)
        for (let i = 0; i < 15; i++) g.hook("onTurnStart",
            {
                side: "A"
            })
        assert.equal(d.maxHp,
            m0 + 400)
        assert.equal(cnt(d,
            "tim_khong_than"),
        10)
        g.kill(d,
            u(s,
                "B",
                "garen"))
        assert.equal(d.maxHp,
            m0 + 400)
        assert.equal(cnt(d,
            "tim_khong_than"),
        10)
    })

G("Pháp sư và mana")
test("Bùa Lam: +20 AP, +20 mana tối đa, hồi thêm 10 mana mỗi lượt",
    () => {
        const s = mk()
        const lux = u(s,
            "A",
            "lux")
        const g = new Game(s)
        const mx = g.maxMana(lux), rg = g.manaRegen(lux), ap = g.stats(lux).ap
        g.equip(lux,
            "bua_lam")
        assert.equal(g.maxMana(lux),
            mx + 20)
        assert.equal(g.manaRegen(lux),
            rg + 10)
        assert.equal(g.stats(lux).ap,
            ap + 20)
    })
test("Trượng Trường Sinh: +40 mana tối đa, +1 AP mỗi 2 mana tối đa",
    () => {
        const s = mk()
        const lux = u(s,
            "A",
            "lux")
        const g = new Game(s)
        const mx = g.maxMana(lux), ap = g.stats(lux).ap
        g.equip(lux,
            "truong_truong_sinh")
        assert.equal(g.maxMana(lux),
            mx + 40)
        assert.equal(g.stats(lux).ap,
            ap + Math.floor((mx + 40) / 2))
        const d = u(s,
            "A",
            "darius")
        g.equip(d,
            "truong_truong_sinh")
        assert.equal(g.stats(d).ap,
            0)
    })
test("Luden: chiêu tốn ít hơn 30% mana, làm tròn xuống bội 5",
    () => {
        const s = mk()
        const lux = u(s,
            "A",
            "lux")
        const g = new Game(s)
        const card = g.skillCard("lux",
            "A",
            "E")
        const def = cg.getHero("lux")!.skills.E
        const before = g.manaCost(lux,
            def,
            card)
        g.equip(lux,
            "ban_dong_hanh_luden")
        const after = g.manaCost(lux,
            def,
            card)
        assert.equal(after,
            Math.floor(before * 0.7 / 5) * 5)
        assert.ok(after < before)
        assert.equal(after % 5,
            0)
        assert.equal(g.stats(lux).ap >= 30,
            true)
    })
test("Manamune: đòn đánh gây thêm 60% AP phép và hồi 15 mana",
    () => {
        const s = mk()
        const lux = u(s,
            "A",
            "lux")
        const g = equip(s,
            lux,
            "than_kiem_manamune")
        lux.mana = 0
        const t = u(s,
            "B",
            "garen")
        const info = g.attack(lux,
            t)!
        assert.ok(info.bonus.some((b) => b.kind === "magic" && b.raw > 0))
        assert.equal(lux.mana,
            15)
    })
test("Liandry: chiêu gây thêm 6% máu tối đa của mục tiêu (phép), 1 lần mỗi mục tiêu mỗi lá",
    () => {
        const s = mk()
        const lux = u(s,
            "A",
            "lux")
        const g = equip(s,
            lux,
            "mat_na_liandry")
        const t = u(s,
            "B",
            "garen")
        g.cur = {
            src: lux.id, card: "lux_e", uid: "c700"
        }
        const n0 = dmgEvents(g).length
        hit(g,
            lux,
            t,
            10,
            "skill")
        hit(g,
            lux,
            t,
            10,
            "skill")
        const extra = dmgEvents(g).slice(n0).filter((e) => e.kind === "magic")
        assert.equal(extra.length,
            1)
        assert.equal(extra[0].amount,
            Math.round(0.06 * t.maxHp * (100 / (100 + g.mr(t)))))
    })
test("Quỷ Thư Morello: lần đầu mỗi lượt chiêu gây sát thương -> Câm Lặng",
    () => {
        const s = mk()
        const lux = u(s,
            "A",
            "lux")
        const g = equip(s,
            lux,
            "quy_thu")
        const t = u(s,
            "B",
            "garen")
        hit(g,
            lux,
            t,
            10,
            "attack")
        assert.ok(!g.has(t,
            "silence"),
        "đòn đánh không Câm Lặng")
        hit(g,
            lux,
            t,
            10,
            "skill")
        assert.ok(g.has(t,
            "silence"))
        g.removeStatus(t,
            "silence")
        hit(g,
            lux,
            t,
            10,
            "skill")
        assert.ok(!g.has(t,
            "silence"),
        "lần 2 cùng lượt không Câm Lặng")
        s.turnNo++
        hit(g,
            lux,
            t,
            10,
            "skill")
        assert.ok(g.has(t,
            "silence"))
    })
test("Găng Bảo Thạch: chiêu chí mạng theo tỉ lệ chí mạng (×1,75)",
    () => {
        const s = mk()
        const lux = u(s,
            "A",
            "lux")
        const g = equip(s,
            lux,
            "gang_bao_thach")
        assert.equal(cg.CARD_ITEMS.gang_bao_thach.spellCritMult,
            1.75)
        assert.ok(Math.abs(g.stats(lux).crit - 0.3) < 1e-9)
        const t = u(s,
            "B",
            "garen")
        for (let i = 0; i < 200; i++) hit(g,
            lux,
            t,
            10,
            "skill")
        const crits = dmgEvents(g).filter((e) => e.crit).length
        assert.ok(crits > 20 && crits < 110,
            `crit ${crits}/200`)
    })
test("Vương Miện: dưới 30% máu -> bất khả xâm phạm hết lượt, một lần mỗi mạng",
    () => {
        const s = mk()
        const lux = u(s,
            "A",
            "lux")
        const g = equip(s,
            lux,
            "vuong_mien")
        const t = u(s,
            "B",
            "garen")
        assert.equal(cnt(lux,
            "vuong_mien"),
        1)
        lux.maxHp = 1000; lux.hp = 400; lux.shield = 0
        hit(g,
            t,
            lux,
            150)
        assert.ok(g.has(lux,
            "invulnerable"))
        assert.equal(cnt(lux,
            "vuong_mien"),
        0)
        const hp = lux.hp
        hit(g,
            t,
            lux,
            100)
        assert.equal(lux.hp,
            hp)
        g.removeStatus(lux,
            "invulnerable")
        lux.hp = 400
        hit(g,
            t,
            lux,
            150)
        assert.ok(!g.has(lux,
            "invulnerable"),
        "hết lượt dùng trong mạng này")
        g.hook("onRespawn",
            {
                unit: lux
            })
        assert.equal(cnt(lux,
            "vuong_mien"),
        1)
    })

G("Đỡ đòn")
test("Áo Choàng Gai: địch đánh trúng nhận 20 + 40% Giáp sát thương phép",
    () => {
        const s = mk()
        const d = u(s,
            "A",
            "darius")
        const g = equip(s,
            d,
            "ao_choang_gai")
        const t = u(s,
            "B",
            "garen")
        const n0 = dmgEvents(g).length
        g.attack(t,
            d)
        const back = dmgEvents(g).slice(n0).filter((e) => e.src === d.id && e.target === t.id)
        assert.equal(back.length,
            1)
        assert.equal(back[0].kind,
            "magic")
        const raw = 20 + 0.4 * g.armor(d)
        assert.equal(back[0].amount,
            Math.round(raw * (100 / (100 + g.mr(t)))))
    })
test("Tim Băng: sát thương đòn đánh của địch lên phe bạn giảm 20%",
    () => {
        const s = mk()
        const d = u(s,
            "A",
            "darius")
        const lux = u(s,
            "A",
            "lux")
        const g = equip(s,
            d,
            "tim_bang")
        const t = u(s,
            "B",
            "garen")
        assert.equal(hit(g,
            t,
            lux,
            1000,
            "attack"),
        800)
        assert.equal(hit(g,
            t,
            lux,
            1000,
            "skill"),
        1000)
        assert.equal(hit(g,
            lux,
            t,
            1000,
            "attack"),
        1000)
    })
test("Áo Choàng Lửa: đầu lượt của bạn mọi tướng địch nhận 5% máu tối đa tướng đeo",
    () => {
        const s = mk()
        const d = u(s,
            "A",
            "darius")
        const g = equip(s,
            d,
            "ao_choang_lua")
        const garen = u(s,
            "B",
            "garen")
        const ashe = u(s,
            "B",
            "ashe")
        const h0 = garen.hp
        g.hook("onTurnStart",
            {
                side: "B"
            })
        assert.equal(garen.hp,
            h0)
        g.hook("onTurnStart",
            {
                side: "A"
            })
        const want = Math.round(0.05 * d.maxHp * (100 / (100 + g.mr(garen))))
        assert.equal(h0 - garen.hp,
            want)
        assert.ok(ashe.hp < 100000)
    })
test("Khiên Hư Vô: tướng địch đối diện nhận thêm 30% từ mọi nguồn (không ảnh hưởng tướng khác)",
    () => {
        const s = mk()
        const d = u(s,
            "A",
            "darius")
        const g = equip(s,
            d,
            "khien_hu_vo")
        assert.equal(hit(g,
            d,
            u(s,
                "B",
                "garen"),
            1000),
        1300)
        assert.equal(hit(g,
            d,
            u(s,
                "B",
                "ashe"),
            1000),
        1000)
    })
test("Khăn Giải Thuật: khống chế đầu tiên mỗi lượt bị huỷ, cái sau thì không",
    () => {
        const s = mk()
        const d = u(s,
            "A",
            "darius")
        const g = equip(s,
            d,
            "khan_giai_thuat")
        const t = u(s,
            "B",
            "garen")
        g.cur = {
            src: t.id, card: "garen_q", uid: "c500"
        }
        g.status(d,
            "stun",
            1)
        assert.ok(!g.has(d,
            "stun"))
        g.cur = {
            src: t.id, card: "garen_e", uid: "c501"
        }
        g.status(d,
            "silence",
            1)
        assert.ok(g.has(d,
            "silence"))
        g.status(d,
            "chill",
            1)
        assert.ok(g.has(d,
            "chill"),
        "chill không phải khống chế bị huỷ")
        s.turnNo++
        g.cur = {
            src: t.id, card: "garen_q", uid: "c502"
        }
        g.status(d,
            "stun",
            1)
        assert.ok(!g.has(d,
            "stun"))
        g.status(d,
            "disarm",
            1)
        assert.ok(!g.has(d,
            "disarm"),
        "cùng lá: huỷ cả 2")
    })
test("Giáp Thiên Thần: lần đầu bị hạ đứng dậy 50% máu, không mất mạng; lần 2 chết",
    () => {
        const s = mk()
        const d = u(s,
            "A",
            "darius")
        const g = equip(s,
            d,
            "giap_thien_than")
        const t = u(s,
            "B",
            "garen")
        assert.equal(cnt(d,
            "giap_thien_than"),
        1)
        const lives = s.players.A.lives
        const kills = s.stats.B.kills
        d.maxHp = 1000; d.hp = 100; d.shield = 0
        hit(g,
            t,
            d,
            5000,
            "attack")
        assert.equal(d.status,
            "board")
        assert.equal(d.hp,
            500)
        assert.equal(s.players.A.lives,
            lives)
        assert.equal(s.stats.B.kills,
            kills)
        assert.equal(cnt(d,
            "giap_thien_than"),
        0)
        assert.equal(s.lanes.A[2],
            d.id)
        hit(g,
            t,
            d,
            5000,
            "attack")
        assert.equal(d.status,
            "dead")
        assert.equal(s.players.A.lives,
            lives - 1)
    })

G("Trợ thủ")
test("Dây Chuyền Chuộc Tội: hồi máu và Khiên ban ra mạnh hơn 60%",
    () => {
        const s = mk()
        const d = u(s,
            "A",
            "darius")
        const lux = u(s,
            "A",
            "lux")
        const g = equip(s,
            d,
            "day_chuyen_chuoc_toi")
        lux.hp = 500; lux.shield = 0
        assert.equal(g.heal(d,
            lux,
            100),
        160)
        g.shield(d,
            lux,
            100)
        assert.equal(lux.shield,
            160)
        assert.equal(g.givenMult(d),
            1.6)
        const h = lux.hp
        assert.equal(g.heal(lux,
            lux,
            100),
        100)
        assert.equal(lux.hp,
            h + 100)
    })
test("Vuốt Rồng: hồi máu và Khiên tướng đeo nhận mạnh hơn 60%",
    () => {
        const s = mk()
        const d = u(s,
            "A",
            "darius")
        const g = equip(s,
            d,
            "vuot_rong")
        d.hp = 500; d.shield = 0
        assert.equal(g.heal(d,
            d,
            100),
        160)
        g.shield(undefined,
            d,
            100)
        assert.equal(d.shield,
            160)
    })
test("Lời Thề Hộ Vệ: tướng đeo gánh 25% sát thương đồng minh khác nhận",
    () => {
        const s = mk()
        const lux = u(s,
            "A",
            "lux")
        const d = u(s,
            "A",
            "darius")
        const g = equip(s,
            lux,
            "loi_the_ho_ve")
        const t = u(s,
            "B",
            "garen")
        const lh = lux.hp, dh = d.hp
        hit(g,
            t,
            d,
            1000)
        assert.equal(lh - lux.hp,
            250)
        assert.equal(dh - d.hp,
            750)
    })
test("Mũ Thích Nghi: chiêu địch đầu tiên mỗi lượt nhắm tướng đeo bị miễn (immune)",
    () => {
        const s = mk()
        const lux = u(s,
            "A",
            "lux")
        const g = equip(s,
            lux,
            "mu_thich_nghi")
        const t = u(s,
            "B",
            "garen")
        const card = {
            uid: "cx", kind: "skill", id: "garen_q"
        } as cg.Card
        const skill = cg.getHero("garen")!.skills.Q
        const d1 = {
            src: t, card, skill, affected: [lux.id], immune: [] as string[]
        }
        g.hook("onTargeted",
            d1)
        assert.deepEqual(d1.immune,
            [lux.id])
        const d2 = {
            src: t, card, skill, affected: [lux.id], immune: [] as string[]
        }
        g.hook("onTargeted",
            d2)
        assert.deepEqual(d2.immune,
            [])
        const d3 = {
            src: u(s,
                "A",
                "darius"), card, skill, affected: [lux.id], immune: [] as string[]
        }
        s.turnNo++
        g.hook("onTargeted",
            d3)
        assert.deepEqual(d3.immune,
            [],
            "lá của đồng minh không bị miễn")
    })

G("Ghép qua engine (legalActions / craft / upgrade)")
test("Mọi cặp mảnh ghép được trên tay ra đúng món của bảng ghép V2 (kể cả Tim Khổng Thần)",
    () => {
        for (let i = 0; i < PIECES.length; i++) for (let k = i; k < PIECES.length; k++) {
            const s = mk()
            const g = new Game(s)
            const a = g.newCard({
                kind: "support", id: "item", item: PIECES[i]
            })
            const b = g.newCard({
                kind: "support", id: "item", item: PIECES[k]
            })
            const gold = g.newCard({
                kind: "support", id: "gold"
            })
            s.players.A.hand = [a,
                b,
                gold]
            const want = cg.cardCombine(PIECES[i],
                PIECES[k])!
            const act = cg.legalActions(s,
                "A").find((x) => x.t === "craft")
            assert.ok(act,
                `${PIECES[i]}+${PIECES[k]} không ghép được`)
            const r = cg.applyAction(s,
                act)
            assert.ok(r.state.players.A.hand.some((c) => c.id === "legend" && c.item === want),
                `${PIECES[i]}+${PIECES[k]} phải ra ${want}`)
        }
        assert.equal(cg.cardCombine("gang_tay",
            "dai_khong_lo"),
        "tim_khong_than")
    })
test("Ghép tại chỗ: tướng mang 1 mảnh + 1 mảnh trên tay + 1 Vàng -> món thay đúng ô",
    () => {
        const s = mk()
        const g = new Game(s)
        g.equip(u(s,
            "A",
            "darius"),
        "gang_tay")
        const piece = g.newCard({
            kind: "support", id: "item", item: "dai_khong_lo"
        })
        const gold = g.newCard({
            kind: "support", id: "gold"
        })
        s.players.A.hand = [piece,
            gold]
        const act = cg.legalActions(s,
            "A").find((x) => x.t === "upgrade")
        assert.ok(act)
        const r = cg.applyAction(s,
            act)
        assert.deepEqual(u(r.state,
            "A",
            "darius").items,
        ["tim_khong_than"])
        assert.equal(r.state.players.A.hand.length,
            0)
    })
test("Lá mảnh trên tay mô tả bằng itemText (tên + chỉ số mảnh)",
    () => {
        const s = mk()
        const g = new Game(s)
        const c = g.newCard({
            kind: "support", id: "item", item: "kiem_dai"
        })
        const info = cg.cardInfo(g,
            c)
        assert.ok(info.name.includes(cg.itemText("kiem_dai")!.name),
            info.name)
        assert.ok(info.desc.includes(cg.itemText("kiem_dai")!.stats),
            info.desc)
    })

G("Ổn định")
test("Mỗi món/mảnh đeo lên tướng: bot tự chơi 500 bước không lỗi",
    () => {
        for (const id of [...PIECES,
            ...LEGENDS]) {
            let s = mk()
            for (const x of Object.values(s.units)) if (x.status === "board") { x.maxHp = 700; x.hp = 700 }
            const g = new Game(s)
            for (const h of ["darius",
                "lux"]) g.equip(u(s,
                "A",
                h),
            id)
            g.equip(u(s,
                "B",
                "garen"),
            id)
            for (let i = 0; i < 500 && s.phase !== "over"; i++) s = cg.applyAction(s,
                cg.chooseAction(s,
                    cg.whoseMove(s))).state
        }
    })

let lastGroup = ""
for (const r of results) {
    if (r.group !== lastGroup) { console.log(`\n== ${r.group} ==`); lastGroup = r.group }
    console.log(`${r.res}  ${r.name}${r.note ? `\n        -> ${r.note}` : ""}`)
}
const n = (k: string) => results.filter((r) => r.res === k).length
console.log(`\nTỔNG: ${results.length} test | PASS ${n("PASS")} | FAIL ${n("FAIL")}`)
process.exit(n("FAIL") ? 1 : 0)
