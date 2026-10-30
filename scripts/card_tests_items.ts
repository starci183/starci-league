// Test đồ chế độ thẻ bài V4 (bản duyệt 30/10/2026 + mana đội chốt 31/10): 8 mảnh, 36 món, bảng ghép 8x8, chỉ số, 2 nội tại mỗi món, chữ hiển thị.
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

const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps
/** Lá chiêu giả đang giải quyết (để gom gói sát thương theo uid) */
const casting = (g: cg.Game, unit: cg.Unit, card: string, uid: string) => { g.cur = {
    src: unit.id, card, uid
} }
const fakeCard = (id: string, uid: string, hero: string, side: S = "A") => ({
    uid, kind: "skill", id, hero, side
}) as cg.Card

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

G("Đăng ký")
test("Đủ 8 mảnh + 36 món huyền thoại V4, mỗi món có chữ VI/EN",
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
        assert.equal(cg.CARD_ITEMS.huyet_kiem,
            undefined)
        assert.equal(cg.CARD_ITEMS.loi_nhac_tu_vong,
            undefined)
    })
test("Không còn chữ nói về mana riêng của tướng",
    () => {
        for (const id of [...PIECES,
            ...LEGENDS]) for (const lang of ["vi",
            "en"] as const) {
            const t = cg.itemText(id,
                lang)!
            assert.doesNotMatch(`${t.stats} ${t.desc}`,
                /mana tối đa|hồi mana của tướng|\bMage: \+|max mana/i,
                `${id} ${lang}`)
        }
    })
test("Tên hiển thị V4 (id giữ nguyên)",
    () => {
        const exp: Record<string, string> = {
            sung_hextech: "Kiếm Súng Hextech", ao_choang_gai: "Giáp Gai", giap_gargoyle: "Thú Tượng Thạch Giáp", loi_the_ho_ve: "Lời Thề Hiệp Sĩ",
            khien_hu_vo: "Giáp Vai Nguyệt Thần", vuong_mien: "Vương Miện Hoàng Gia", mat_na_liandry: "Mặt Nạ Đọa Đày Liandry", truong_truong_sinh: "Quyền Trượng Thiên Thần",
            y_chi_titan: "Rìu Đại Mãng Xà", sat_thu_kraken: "Móc Diệt Thủy Quái", ke_thu_thap: "Súng Hải Tặc", tim_khong_than: "Trái Tim Khổng Thần",
            than_kiem_manamune: "Kiếm Manamune", ban_dong_hanh_luden: "Vọng Âm Luden", bua_lam: "Bùa Xanh", ao_choang: "Áo Choàng Bạc", gang_tay: "Găng Đấu Tập", dao_tim: "Đao Tím",
        }
        for (const [id,
            vi] of Object.entries(exp)) assert.equal(cg.itemText(id,
                "vi")!.name,
            vi,
            id)
    })
test("Món có bộ đếm hiện",
    () => {
        assert.deepEqual(Object.values(cg.CARD_ITEMS).filter((d) => d.stack).map((d) => d.id).sort(),
            ["cuong_dao",
                "giap_thien_than",
                "mu_rabadon",
                "tim_khong_than",
                "truong_truong_sinh",
                "vo_cuc_kiem"])
        assert.equal(cg.itemText("tim_khong_than",
            "en")!.counter?.max,
        10)
        assert.equal(cg.itemText("vuot_rong",
            "vi")!.counter,
        undefined)
    })
test("Chữ mảnh và dòng chỉ số (không còn \"+X mana tối đa\"; mana ghi rõ loại hiệu ứng)",
    () => {
        assert.match(cg.itemText("kiem_dai",
            "vi")!.desc,
        /Đeo riêng/)
        assert.match(cg.itemText("gang_tay",
            "en")!.stats,
        /15% Crit chance/)
        assert.equal(cg.itemText("nuoc_mat",
            "vi")!.stats,
        "+15% sát thương chiêu")
        assert.match(cg.itemText("nuoc_mat",
            "vi")!.desc,
        /tốn ít hơn 5 mana/)
        assert.equal(cg.itemText("bua_lam",
            "vi")!.stats,
        "+10 hồi mana đội mỗi lượt")
        for (const id of [...PIECES,
            ...LEGENDS]) {
            assert.doesNotMatch(cg.itemText(id,
                "vi")!.stats,
            /mana tối đa/,
            id)
            assert.equal(cg.CARD_ITEMS[id].maxMana,
                undefined,
                id)
        }
        assert.match(cg.itemText("cung_go",
            "vi")!.stats,
        /\+20 Tốc Đánh/)
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
        assert.match(cg.itemText("ao_choang_gai",
            "vi",
            g,
            d)!.desc,
        /\d+ \(15 \+ 25% Giáp\)/)
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
test("Công thức V4",
    () => {
        const exp: [string, string, string][] = [["kiem_dai",
            "cung_go",
            "cuong_dao"],
        ["kiem_dai",
            "ao_choang",
            "dao_tim"],
        ["gay_qua_kho",
            "cung_go",
            "nanh_nashor"],
        ["kiem_dai",
            "gay_qua_kho",
            "sung_hextech"],
        ["cung_go",
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
        r,
        `${a}+${b}`)
        assert.equal(cg.cardCombine("kiem_dai",
            "khong_co"),
        undefined)
        assert.deepEqual(cg.cardRecipeOf("tim_bang")!.sort(),
            ["cung_go",
                "giap_luoi"])
    })

G("Mảnh")
test("Mảnh V4: Kiếm 15 AD, Gậy 30 AP, Cung 20 Tốc Đánh, Găng 15% CM, Giáp Lưới 30, Áo Choàng Bạc 30, Đai 80 Máu, Nước Mắt 15% sát thương chiêu",
    () => {
        const s = mk()
        const d = u(s,
            "A",
            "darius")
        const g = new Game(s)
        const as0 = g.attackSpeed(d)
        // tướng chỉ có 3 ô: cộng chỉ số từng mảnh trên 1 tướng tạm
        const st = {
            atk: 0, ap: 0, crit: 0, armor: 0, mr: 0, hp: 0, spellAmp: 0
        }
        for (const p of PIECES) {
            d.items = []; d.itemSince = []
            g.equip(d,
                p)
            const x = g.stats(d)
            for (const k of Object.keys(st) as (keyof typeof st)[]) st[k] += x[k]
            if (p === "cung_go") assert.equal(g.attackSpeed(d),
                as0 + 20)
        }
        assert.equal(st.atk,
            15)
        assert.equal(st.ap,
            30)
        assert.ok(near(st.crit,
            0.15))
        assert.equal(st.armor,
            30)
        assert.equal(st.mr,
            30)
        assert.equal(st.hp,
            80)
        assert.ok(near(st.spellAmp,
            0.15))
        assert.equal(g.maxMana(d),
            cg.RULES.teamManaMax,
            "mana đồ không nới trần bể")
    })
test("Nước Mắt Nữ Thần (loại 1): chiêu của người đeo tốn ít hơn 5 mana, người khác không đổi",
    () => {
        const s = mk()
        const lux = u(s,
            "A",
            "lux")
        const d = u(s,
            "A",
            "darius")
        const g = new Game(s)
        const def = cg.getHero("lux")!.skills.E
        const card = g.skillCard("lux",
            "A",
            "E")
        const cost = g.manaCost(lux,
            def,
            card)
        const rg = g.manaRegen(lux)
        g.equip(d,
            "nuoc_mat")
        assert.equal(g.manaCost(lux,
            def,
            card),
        cost,
        "không phải người đeo")
        g.equip(lux,
            "nuoc_mat")
        assert.equal(g.manaCost(lux,
            def,
            card),
        Math.max(0,
            cost - 5))
        assert.equal(g.manaRegen(lux),
            rg,
            "không hồi thêm cho đội")
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
            90)
    })

G("Hàng Kiếm Dài")
test("Kiếm Tử Thần: 40 + 30 AD, Đấu Sĩ/Sát Thủ thêm 20; bản sao chỉ cộng chỉ số gốc",
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
            "kiem_tu_than")
        g.equip(lux,
            "kiem_tu_than")
        assert.equal(g.stats(d).atk,
            90)
        assert.equal(g.stats(lux).atk,
            70)
        g.equip(d,
            "kiem_tu_than")
        assert.equal(g.stats(d).atk,
            130)
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
test("Kiếm Súng Hextech: hút 15% sát thương thực tế; chiêu đánh dấu -> đòn đánh đầu tiên thêm 20% AD + 40% AP phép, 1 lần/lượt",
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
        d.hp = 50000
        hit(g,
            d,
            t,
            1000)
        assert.equal(d.hp,
            50150)
        assert.equal(g.attack(d,
            t)!.bonus.filter((b) => b.kind === "magic").length,
        0,
        "chưa có dấu")
        casting(g,
            d,
            "darius_q",
            "c900")
        hit(g,
            d,
            t,
            10,
            "skill")
        const info = g.attack(d,
            t)!
        const extra = info.bonus.filter((b) => b.kind === "magic")
        assert.equal(extra.length,
            1)
        assert.ok(near(extra[0].raw,
            0.2 * g.atk(d) + 0.4 * g.ap(d)))
        hit(g,
            d,
            t,
            10,
            "skill")
        assert.equal(g.attack(d,
            t)!.bonus.filter((b) => b.kind === "magic").length,
        0,
        "1 lần/lượt")
    })
test("Cuồng Đao Guinsoo: +25 AD +25 TĐ; mỗi đòn trúng +5 TĐ vĩnh viễn (tối đa +100); thêm 4% máu hiện tại mục tiêu",
    () => {
        const s = mk()
        const d = u(s,
            "A",
            "darius")
        const g = new Game(s)
        const as0 = g.attackSpeed(d)
        g.equip(d,
            "cuong_dao")
        assert.equal(g.stats(d).atk,
            25)
        assert.equal(g.attackSpeed(d),
            as0 + 25)
        const t = u(s,
            "B",
            "garen")
        t.hp = 50000
        const info = g.attack(d,
            t)!
        assert.ok(info.bonus.some((b) => b.kind === "physical" && near(b.raw,
            0.04 * 50000)))
        assert.equal(cnt(d,
            "cuong_dao"),
        1)
        assert.equal(g.attackSpeed(d),
            as0 + 30)
        for (let i = 0; i < 30; i++) g.attack(d,
            t)
        assert.equal(cnt(d,
            "cuong_dao"),
        20)
        g.kill(d,
            t)
        assert.equal(cnt(d,
            "cuong_dao"),
        20,
        "giữ qua chết")
    })
test("Vô Cực Kiếm: +25 AD, +25% chí mạng, giữ hệ số ×2,25; 2 đòn không chí mạng -> đòn kế chắc chắn chí mạng",
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
            25)
        assert.ok(near(st.crit,
            0.25))
        assert.ok(near(cg.RULES.critBase + st.critDmg,
            2.25))
        const t = u(s,
            "B",
            "garen")
        g.rand = () => 0.99
        assert.equal(g.attack(d,
            t)!.crit,
        false)
        assert.equal(g.attack(d,
            t)!.crit,
        false)
        assert.equal(g.attack(d,
            t)!.crit,
        true)
        assert.equal(d.stacks["item:vo_cuc_kiem"],
            0)
    })
test("Áo Choàng Bóng Tối: đầu lượt 50 Khiên vàng không cộng dồn; sắp chết giữ 1 máu + miễn sát thương, hồi 10 lượt",
    () => {
        const s = mk()
        const d = u(s,
            "A",
            "darius")
        const g = equip(s,
            d,
            "ao_choang_bong_toi")
        const t = u(s,
            "B",
            "garen")
        g.hook("onTurnStart",
            {
                side: "A"
            })
        assert.equal(g.shieldOf(d,
            "physical"),
        50)
        assert.equal(d.shieldTimed?.[0].until,
            s.turnNo + 1,
            "hết hạn cuối lượt địch")
        d.shieldPhys = 0; d.shieldTimed = []
        s.ownTurns = {
            A: 3
        }
        const lives = s.players.A.lives
        d.maxHp = 1000; d.hp = 100
        hit(g,
            t,
            d,
            5000,
            "attack")
        assert.equal(d.status,
            "board")
        assert.equal(d.hp,
            1)
        assert.equal(s.players.A.lives,
            lives)
        assert.ok(g.has(d,
            "invulnerable"))
        g.removeStatus(d,
            "invulnerable")
        s.ownTurns = {
            A: 12
        }
        hit(g,
            t,
            d,
            5000,
            "attack")
        assert.equal(d.status,
            "dead",
            "còn hồi chiêu")
    })
test("Đao Tím: đòn trúng thêm 15 + 10% KP phép (tối đa 35); tụt qua 50% máu -> 120 Khiên xanh, hồi 5 lượt",
    () => {
        const s = mk()
        const d = u(s,
            "A",
            "darius")
        const g = equip(s,
            d,
            "dao_tim")
        const t = u(s,
            "B",
            "garen")
        const b = g.attack(d,
            t)!.bonus.find((x) => x.kind === "magic")!
        assert.ok(near(b.raw,
            Math.min(35,
                15 + 0.1 * g.mr(d))))
        d.maxHp = 1000; d.hp = 600
        hit(g,
            t,
            d,
            150)
        assert.equal(g.shieldOf(d,
            "magic"),
        120)
        d.shieldMagic = 0; d.hp = 600
        hit(g,
            t,
            d,
            150)
        assert.equal(g.shieldOf(d,
            "magic"),
        0,
        "đang hồi chiêu")
        s.ownTurns = {
            A: 5
        }
        d.hp = 600
        hit(g,
            t,
            d,
            150)
        assert.equal(g.shieldOf(d,
            "magic"),
        120)
    })
test("Móng Vuốt Sterak: +3 AD mỗi 10% máu đã mất (tối đa 20); tụt qua 40% -> Khiên 30% máu tối đa, hồi 5 lượt",
    () => {
        const s = mk()
        const d = u(s,
            "A",
            "darius")
        const g = equip(s,
            d,
            "sterak")
        d.maxHp = 1000; d.hp = 1000
        assert.equal(g.stats(d).atk,
            20)
        d.hp = 750
        assert.equal(g.stats(d).atk,
            26)
        d.hp = 10
        assert.equal(g.stats(d).atk,
            40)
        d.hp = 450
        hit(g,
            u(s,
                "B",
                "garen"),
            d,
            100)
        assert.equal(d.shield,
            300)
        d.shield = 0; d.hp = 450
        hit(g,
            u(s,
                "B",
                "garen"),
            d,
            100)
        assert.equal(d.shield,
            0,
            "hồi chiêu")
    })
test("Ngọn Giáo Shojin: đòn trúng hồi 5 mana đội (tối đa 10/lượt); đánh trúng lượt này -> lá chiêu đầu lượt sau +25% (mọi gói của lá đó)",
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
        s.teamMana.A = 100
        s.ownTurns = {
            A: 3
        }
        casting(g,
            d,
            "darius_q",
            "c799")
        assert.equal(hit(g,
            d,
            t,
            1000,
            "skill"),
        1000,
        "chưa nạp")
        g.attack(d,
            t)
        assert.equal(s.teamMana.A,
            105)
        g.attack(d,
            t)
        g.attack(d,
            t)
        assert.equal(s.teamMana.A,
            110,
            "tối đa 10 mỗi lượt")
        s.ownTurns = {
            A: 4
        }
        s.turnNo += 2
        casting(g,
            d,
            "darius_q",
            "c800")
        assert.equal(hit(g,
            d,
            t,
            1000,
            "skill"),
        1250)
        assert.equal(hit(g,
            d,
            t,
            1000,
            "skill"),
        1250)
        casting(g,
            d,
            "darius_e",
            "c801")
        assert.equal(hit(g,
            d,
            t,
            1000,
            "skill"),
        1000)
    })

G("Hàng Gậy Quá Khổ")
test("Rabadon: 50 AP, tổng AP +30%; 2 lá chiêu khác tên trong lượt -> +10 AP vĩnh viễn (tối đa 30)",
    () => {
        const s = mk()
        const d = u(s,
            "A",
            "darius")
        const g = equip(s,
            d,
            "mu_rabadon")
        assert.equal(g.stats(d).ap,
            65)
        const skill = cg.getHero("darius")!.skills.Q
        g.hook("onCast",
            {
                caster: d, card: fakeCard("darius_q",
                    "c1",
                    "darius"), skill
            })
        g.hook("onCast",
            {
                caster: d, card: fakeCard("darius_q",
                    "c2",
                    "darius"), skill
            })
        assert.equal(cnt(d,
            "mu_rabadon"),
        0,
        "cùng tên")
        g.hook("onCast",
            {
                caster: d, card: fakeCard("darius_e",
                    "c3",
                    "darius"), skill
            })
        assert.equal(cnt(d,
            "mu_rabadon"),
        10)
        assert.equal(g.stats(d).ap,
            78)
    })
test("Nanh Nashor: đòn trúng thêm 15 + 25% AP phép; 3 đòn liên tiếp cùng mục tiêu -> -15 KP",
    () => {
        const s = mk()
        const d = u(s,
            "A",
            "darius")
        const g = equip(s,
            d,
            "nanh_nashor")
        const t = u(s,
            "B",
            "garen")
        const ashe = u(s,
            "B",
            "ashe")
        const b = g.attack(d,
            t)!.bonus.find((x) => x.kind === "magic")!
        assert.ok(near(b.raw,
            15 + 0.25 * g.ap(d)))
        g.attack(d,
            ashe) // đổi mục tiêu: mất nhịp
        g.attack(d,
            t)
        g.attack(d,
            t)
        assert.ok(!g.has(t,
            "mr_down"))
        g.attack(d,
            t)
        assert.equal(g.statusV(t,
            "mr_down"),
        15)
    })
test("Găng Bảo Thạch: chiêu chí mạng ×2,25; chiêu lên địch đã có hiệu ứng xấu của người đeo TRƯỚC lá -> bỏ qua 15 KP",
    () => {
        const s = mk()
        const lux = u(s,
            "A",
            "lux")
        const g = equip(s,
            lux,
            "gang_bao_thach")
        assert.equal(cg.CARD_ITEMS.gang_bao_thach.spellCritMult,
            2.25)
        assert.ok(near(g.stats(lux).crit,
            0.25))
        const t = u(s,
            "B",
            "garen")
        g.rand = () => 0.99
        const skill = cg.getHero("lux")!.skills.Q
        const play = (uid: string) => { casting(g,
            lux,
            "lux_q",
            uid); g.hook("onPlay",
            {
                side: "A", card: fakeCard("lux_q",
                    uid,
                    "lux"), unit: lux
            }); return g.damage(lux,
            t,
            1000,
            "magic",
            {
                tag: "skill"
            }) }
        const plain = play("c60")
        g.status(t,
            "chill",
            1) // đặt bởi lá c60 (đang giải quyết): lá c60 không được tính
        const pierced = play("c61")
        assert.ok(pierced > plain,
            `${pierced} > ${plain}`)
        void skill
    })
test("Vương Miện Hoàng Gia: lá chiêu đầu tiên trong lượt -> 60 Khiên vàng (nạp lại, không cộng dồn); vỡ -> +20 AP",
    () => {
        const s = mk()
        const lux = u(s,
            "A",
            "lux")
        const g = equip(s,
            lux,
            "vuong_mien")
        const skill = cg.getHero("lux")!.skills.Q
        const ap = g.stats(lux).ap
        g.hook("onCast",
            {
                caster: lux, card: fakeCard("lux_q",
                    "c1",
                    "lux"), skill
            })
        assert.equal(g.shieldOf(lux,
            "physical"),
        60)
        g.hook("onCast",
            {
                caster: lux, card: fakeCard("lux_q",
                    "c2",
                    "lux"), skill
            })
        assert.equal(g.shieldOf(lux,
            "physical"),
        60,
        "1 lần/lượt")
        g.damage(u(s,
            "B",
            "garen"),
        lux,
        100000,
        "physical",
        {
            tag: "attack"
        })
        assert.equal(g.shieldOf(lux,
            "physical"),
        0)
        assert.equal(g.stats(lux).ap,
            ap + 20)
    })
test("Quỷ Thư Morello: chiêu gây Vết Thương Sâu; lá sau trúng địch đã có VTS -> 60 Khiên xanh",
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
        casting(g,
            lux,
            "lux_q",
            "c70")
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
        assert.ok(g.has(t,
            "grievous"))
        assert.equal(g.shieldOf(lux,
            "magic"),
        0,
        "VTS do chính lá này đặt không tính")
        casting(g,
            lux,
            "lux_e",
            "c71")
        hit(g,
            lux,
            t,
            10,
            "skill")
        assert.equal(g.shieldOf(lux,
            "magic"),
        60)
    })
test("Liandry: AP = 8% máu cộng thêm (tối đa 60); Tro Tàn 2 lượt của mục tiêu, 3% máu tối đa, +50% khi người đeo <= 50% máu",
    () => {
        const s = mk()
        const lux = u(s,
            "A",
            "lux")
        const g = new Game(s)
        lux.maxHp = 320; lux.hp = 320
        g.equip(lux,
            "mat_na_liandry")
        assert.equal(g.stats(lux).ap,
            25 + Math.round(0.08 * 120))
        lux.maxHp = 100000; lux.hp = 100000
        assert.equal(g.stats(lux).ap,
            85)
        const t = u(s,
            "B",
            "garen")
        casting(g,
            lux,
            "lux_q",
            "c80")
        hit(g,
            lux,
            t,
            10,
            "skill")
        const tick = () => { const n0 = dmgEvents(g).length; g.hook("onTurnStart",
            {
                side: "B"
            }); return dmgEvents(g).slice(n0).filter((e) => e.target === t.id && e.kind === "magic") }
        const a = tick()
        assert.equal(a.length,
            1)
        assert.equal(a[0].amount,
            Math.round(0.03 * t.maxHp * (100 / (100 + g.mr(t)))))
        lux.hp = 100
        const b = tick()
        assert.equal(b[0].amount,
            Math.round(0.045 * t.maxHp * (100 / (100 + g.mr(t)))))
        assert.equal(tick().length,
            0,
            "hết 2 lượt")
    })
test("Quyền Trượng Thiên Thần: không đọc bể đội thành AP; mỗi 20 mana tướng đeo thực trả +5 AP, tối đa +40",
    () => {
        const s = mk()
        const lux = u(s,
            "A",
            "lux")
        const g = new Game(s)
        const ap = g.stats(lux).ap
        g.equip(lux,
            "truong_truong_sinh")
        assert.equal(g.stats(lux).ap,
            ap + 20)
        const card = g.skillCard("lux",
            "A",
            "E")
        s.teamMana.A = 200
        g.spendMana(lux,
            30,
            card)
        assert.equal(g.stats(lux).ap,
            ap + 25)
        g.spendMana(lux,
            10,
            card)
        assert.equal(g.stats(lux).ap,
            ap + 30)
        g.spendMana(lux,
            150,
            card)
        assert.equal(g.stats(lux).ap,
            ap + 60)
        const d = u(s,
            "A",
            "darius")
        g.equip(d,
            "truong_truong_sinh")
        assert.equal(g.stats(d).ap,
            20)
    })
test("Quyền Trượng Thiên Thần: đòn chí tử + đội >= 30 mana -> tiêu 30 mana, Khiên trắng 80 + 100% AP trước đòn; hồi 5 lượt",
    () => {
        const s = mk()
        const lux = u(s,
            "A",
            "lux")
        const g = equip(s,
            lux,
            "truong_truong_sinh")
        const t = u(s,
            "B",
            "garen")
        s.teamMana.A = 100
        lux.maxHp = 1000; lux.hp = 100
        const sh = 80 + g.ap(lux)
        hit(g,
            t,
            lux,
            150)
        assert.equal(lux.status,
            "board")
        assert.equal(lux.hp,
            100 - Math.max(0,
                150 - sh))
        assert.equal(s.teamMana.A,
            70)
        lux.hp = 10; lux.shield = 0
        hit(g,
            t,
            lux,
            150)
        assert.equal(lux.status,
            "dead",
            "đang hồi chiêu")
        const s2 = mk()
        const l2 = u(s2,
            "A",
            "lux")
        const g2 = equip(s2,
            l2,
            "truong_truong_sinh")
        s2.teamMana.A = 20
        l2.maxHp = 1000; l2.hp = 100
        hit(g2,
            u(s2,
                "B",
                "garen"),
            l2,
            150)
        assert.equal(l2.status,
            "dead",
            "thiếu mana")
    })

G("Hàng Cung Gỗ")
test("Lời Thề Hiệp Sĩ: khi đeo tự bảo hộ đồng minh máu thấp nhất; mỗi lượt đổi người bảo hộ 1 lần (hành động vow, miễn phí); sát thương chuyển theo người được chọn",
    () => {
        const s = mk()
        const g = new Game(s)
        g.summon("A",
            "annie",
            3)
        for (const x of Object.values(s.units)) if (x.status === "board") { x.maxHp = 100000; x.hp = 100000 }
        const d = u(s,
                "A",
                "darius"), lux = u(s,
                "A",
                "lux")
        lux.hp = 50000
        g.equip(d,
            "loi_the_ho_ve")
        assert.equal(d.stacks["itemT:vow:link:A:lux"],
            1,
            "khi đeo: chọn đồng minh máu thấp nhất")
        const vows = cg.legalActions(s,
            "A").filter((a) => a.t === "vow")
        assert.deepEqual(vows.map((a) => a.t === "vow" && a.ally),
            ["A:annie"])
        const r = cg.applyAction(s,
            vows[0])
        const s2 = r.state
        assert.equal(s2.units["A:darius"].stacks["itemT:vow:link:A:annie"],
            1)
        assert.equal(s2.actionsThisTurn,
            s.actionsThisTurn,
            "miễn phí")
        assert.ok(!cg.legalActions(s2,
            "A").some((a) => a.t === "vow"),
        "1 lần mỗi lượt")
        const g2 = new Game(s2)
        const dHp = s2.units["A:darius"].hp
        g2.damage(s2.units["B:garen"],
            s2.units["A:annie"],
            1000,
            "true")
        assert.ok(s2.units["A:darius"].hp < dHp,
            "người đeo gánh 20% sát thương của đồng minh mới")
    })
test("Đại Bác Liên Thanh vẫn theo luật buộc đánh Đỡ Đòn khi đánh bằng lá (v4)",
    () => {
        const s = mk()
        const g = new Game(s)
        g.summon("B",
            "braum",
            3)
        const d = u(s,
            "A",
            "darius")
        g.equip(d,
            "dai_bac")
        const ids = cg.attackTargets(g,
            d,
            true).filter((t) => !t.token).map((t) => t.id)
        assert.deepEqual(ids,
            ["B:braum"],
            "lá Đánh thường: chỉ đánh được Đỡ Đòn")
    })
test("Mặt Nạ Liandry: Tro Tàn đã đặt vẫn cháy khi người đeo đã chết",
    () => {
        const s = mk()
        const g = new Game(s)
        const lux = u(s,
                "A",
                "lux"), t = u(s,
                "B",
                "garen")
        g.equip(lux,
            "mat_na_liandry")
        lux.stacks["itemT:ash:B:garen"] = 2
        g.kill(lux)
        assert.equal(lux.status,
            "dead")
        const hp0 = t.hp
        s.active = "B"
        g.hook("onTurnStart",
            {
                side: "B"
            })
        assert.ok(t.hp < hp0,
            "Tro Tàn gây sát thương dù Lux đã chết")
    })
test("Găng Bảo Thạch: hồi máu/Khiên từ lá chiêu có thể chí mạng, chỉ đồng minh tỉ lệ máu thấp nhất được cường hoá",
    () => {
        const s = mk()
        const g = new Game(s)
        const lux = u(s,
                "A",
                "lux"), d = u(s,
                "A",
                "darius")
        g.equip(lux,
            "gang_bao_thach")
        lux.hp = 50000
        d.hp = 20000
        g.rand = () => 0
        g.cur = {
            src: lux.id, card: "lux_q"
        }
        const healLow = g.heal(lux,
            d,
            100)
        g.cur = {
            src: lux.id, card: "lux_q"
        }
        g.heal(lux,
            d,
            1) // khởi tạo mục tiêu cường hoá của lá mới
        const healHigh = g.heal(lux,
            lux,
            100)
        assert.ok(healLow > 100,
            `đồng minh máu thấp được chí mạng (${healLow})`)
        assert.ok(healHigh <= Math.round(100 * g.givenMult(lux)) + 1,
            `người còn lại không được cường hoá (${healHigh})`)
        g.cur = {
            src: lux.id, card: "lux_p"
        }
        assert.ok(g.heal(lux,
            d,
            100) <= Math.round(100 * g.givenMult(lux)) + 1,
        "nội tại không chí mạng")
    })
test("Đại Bác Liên Thanh: +40 TĐ, anyTarget; lần đầu mỗi lượt đánh địch không đối diện +20% đòn chính",
    () => {
        const s = mk()
        const d = u(s,
            "A",
            "darius")
        const g = new Game(s)
        const as0 = g.attackSpeed(d)
        g.equip(d,
            "dai_bac")
        assert.ok(cg.hasAnyTarget(d))
        assert.equal(g.attackSpeed(d),
            as0 + 40)
        assert.equal(g.attack(d,
            u(s,
                "B",
                "garen"))!.mult,
        1,
        "đối diện")
        assert.ok(near(g.attack(d,
            u(s,
                "B",
                "ashe"))!.mult,
        1.2))
        assert.equal(g.attack(d,
            u(s,
                "B",
                "ashe"))!.mult,
        1,
        "1 lần/lượt")
    })
test("Diệt Khổng Lồ: đòn đánh bỏ qua 15 Giáp; +20% lên địch máu tối đa cao hơn",
    () => {
        const s = mk()
        const d = u(s,
            "A",
            "darius")
        const g = new Game(s)
        const t = u(s,
            "B",
            "garen")
        const before = g.damage(d,
            t,
            1000,
            "physical",
            {
                tag: "attack"
            })
        g.equip(d,
            "diet_khong_lo")
        const A = g.armor(t)
        const after = g.damage(d,
            t,
            1000,
            "physical",
            {
                tag: "attack"
            })
        assert.equal(before,
            Math.round(1000 * 100 / (100 + A)))
        assert.equal(after,
            Math.round(1000 * 100 / (100 + A - 15)))
        d.maxHp = 1000
        assert.equal(hit(g,
            d,
            t,
            1000,
            "skill"),
        1200)
        assert.equal(hit(g,
            d,
            t,
            1000,
            "effect"),
        1000)
    })
test("Tim Băng: địch ở đường đối diện ±1 gây ít hơn 15% sát thương đòn đánh; nhiều Tim Băng không nhân lên",
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
        850)
        assert.equal(hit(g,
            t,
            lux,
            1000,
            "skill"),
        1000)
        g.equip(lux,
            "tim_bang")
        assert.equal(hit(g,
            t,
            lux,
            1000,
            "attack"),
        850)
    })
test("Tim Băng: lần đầu mỗi lượt đánh trúng địch chịu Hàn Khí -> đồng minh máu thấp nhất 50 Khiên vàng",
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
        lux.hp = 100
        g.attack(d,
            u(s,
                "B",
                "garen"))
        assert.equal(g.shieldOf(lux,
            "physical"),
        50)
        g.attack(d,
            u(s,
                "B",
                "garen"))
        assert.equal(g.shieldOf(lux,
            "physical"),
        50)
    })
test("Móc Diệt Thủy Quái: đòn thứ 3 liên tiếp cùng tướng thêm 40 + 30% AD chuẩn; trúng phép từ chiêu -> lượt sau 60 Khiên xanh",
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
        const tr = (i: cg.AttackInfo) => i.bonus.filter((b) => b.kind === "true").length
        assert.equal(tr(g.attack(d,
            t)!),
        0)
        assert.equal(tr(g.attack(d,
            t)!),
        0)
        const third = g.attack(d,
            t)!
        assert.equal(tr(third),
            1)
        assert.ok(near(third.bonus.find((b) => b.kind === "true")!.raw,
            40 + 0.3 * g.atk(d)))
        assert.equal(tr(g.attack(d,
            t)!),
        0)
        s.ownTurns = {
            A: 2
        }
        s.active = "B"
        g.damage(t,
            d,
            100,
            "magic",
            {
                tag: "skill"
            })
        s.active = "A"
        s.ownTurns = {
            A: 3
        }
        g.attack(d,
            t)
        assert.equal(g.shieldOf(d,
            "magic"),
        60)
    })
test("Rìu Đại Mãng Xà: đòn trúng thêm 4% máu tối đa; có Khiên -> lan 50% đòn chính lên địch kề mục tiêu",
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
        const ashe = u(s,
            "B",
            "ashe")
        const info = g.attack(d,
            t)!
        assert.ok(info.bonus.some((b) => b.kind === "physical" && near(b.raw,
            0.04 * d.maxHp)))
        assert.equal(ashe.hp,
            100000,
            "không Khiên: không lan")
        g.shield(undefined,
            d,
            50)
        g.attack(d,
            t)
        assert.ok(ashe.hp < 100000)
        const h = ashe.hp
        g.attack(d,
            t)
        assert.equal(ashe.hp,
            h,
            "1 lần/lượt")
    })
test("Kiếm Manamune: +25 AD phẳng, +15 TĐ; hồi 15 mana đội ở đòn trúng đầu tiên sau chiêu trả >= 20 mana, 1 lần/lượt",
    () => {
        const s = mk()
        const lux = u(s,
            "A",
            "lux")
        const g = new Game(s)
        const ad = g.stats(lux).atk
        g.equip(lux,
            "than_kiem_manamune")
        assert.equal(g.stats(lux).atk,
            ad + 25)
        assert.equal(g.stats(lux).attackSpeed,
            15)
        s.active = "A"
        const t = u(s,
            "B",
            "garen")
        s.teamMana.A = 100
        g.attack(lux,
            t)
        assert.equal(s.teamMana.A,
            100)
        g.spendMana(lux,
            20,
            g.skillCard("lux",
                "A",
                "E"))
        g.attack(lux,
            t)
        assert.equal(s.teamMana.A,
            95)
        g.attack(lux,
            t)
        assert.equal(s.teamMana.A,
            95)
    })

G("Hàng Găng Đấu Tập")
test("Súng Hải Tặc: địch còn <= 10% máu tối đa bị hạ (qua cứu chết, 1 lần/lượt); hạ gục -> Khiên 40 + 20% AD",
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
        t.hp = 115
        hit(g,
            d,
            t,
            20,
            "attack")
        assert.equal(t.status,
            "dead")
        assert.equal(d.shield,
            Math.round(40 + 0.2 * g.atk(d)))
        const garen = u(s,
            "B",
            "garen")
        garen.maxHp = 1000; garen.hp = 115
        hit(g,
            d,
            garen,
            20,
            "attack")
        assert.equal(garen.status,
            "board",
            "1 lần/lượt")
        const s2 = mk()
        const d2 = u(s2,
            "A",
            "darius")
        const g2 = equip(s2,
            d2,
            "ke_thu_thap")
        const t2 = u(s2,
            "B",
            "ashe")
        g2.equip(t2,
            "giap_thien_than")
        t2.maxHp = 1000; t2.hp = 115
        hit(g2,
            d2,
            t2,
            20,
            "attack")
        assert.equal(t2.status,
            "board",
            "Giáp Thiên Thần vẫn cứu")
        assert.equal(t2.hp,
            400)
    })
test("Giáp Thiên Thần: +25 Giáp +25% CM; lần đầu bị hạ đứng dậy 40% máu, không mất mạng; đòn kế tiếp chắc chí mạng",
    () => {
        const s = mk()
        const d = u(s,
            "A",
            "darius")
        const g = equip(s,
            d,
            "giap_thien_than")
        assert.ok(near(g.stats(d).crit,
            0.25))
        assert.equal(g.stats(d).mr,
            0)
        const t = u(s,
            "B",
            "garen")
        const lives = s.players.A.lives
        d.maxHp = 1000; d.hp = 100
        hit(g,
            t,
            d,
            5000,
            "attack")
        assert.equal(d.status,
            "board")
        assert.equal(d.hp,
            400)
        assert.equal(s.players.A.lives,
            lives)
        g.rand = () => 0.99
        assert.equal(g.attack(d,
            t)!.crit,
        true)
        assert.equal(g.attack(d,
            t)!.crit,
        false)
        hit(g,
            t,
            d,
            5000,
            "attack")
        assert.equal(d.status,
            "dead")
    })
test("Khăn Giải Thuật: huỷ khống chế đầu tiên (cả lá đó), hồi 3 lượt; đồng minh máu thấp nhất 60 Khiên xanh",
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
            "khan_giai_thuat")
        const t = u(s,
            "B",
            "garen")
        s.ownTurns = {
            A: 1
        }
        casting(g,
            t,
            "garen_q",
            "c500")
        g.status(d,
            "stun",
            1)
        g.status(d,
            "silence",
            1)
        assert.ok(!g.has(d,
            "stun") && !g.has(d,
            "silence"),
        "cùng lá: huỷ hết")
        assert.equal(g.shieldOf(lux,
            "magic"),
        60)
        s.turnNo++
        casting(g,
            t,
            "garen_e",
            "c501")
        g.status(d,
            "stun",
            1)
        assert.ok(g.has(d,
            "stun"),
        "đang hồi chiêu")
        g.status(d,
            "chill",
            1)
        assert.ok(g.has(d,
            "chill"))
        g.removeStatus(d,
            "stun")
        s.ownTurns = {
            A: 4
        }
        casting(g,
            t,
            "garen_q",
            "c502")
        g.status(d,
            "stun",
            1)
        assert.ok(!g.has(d,
            "stun"))
    })
test("Trái Tim Khổng Thần: đòn trúng đầu tiên trong lượt +20 máu tối đa (tối đa +200); chí mạng -> Khiên 8% máu tối đa",
    () => {
        const s = mk()
        const d = u(s,
            "A",
            "darius")
        const g = equip(s,
            d,
            "tim_khong_than")
        const t = u(s,
            "B",
            "garen")
        g.rand = () => 0.99
        const m0 = d.maxHp
        g.attack(d,
            t)
        g.attack(d,
            t)
        assert.equal(d.maxHp,
            m0 + 20)
        for (let i = 0; i < 15; i++) { s.turnNo += 2; g.attack(d,
            t) }
        assert.equal(d.maxHp,
            m0 + 200)
        assert.equal(cnt(d,
            "tim_khong_than"),
        10)
        g.rand = () => 0
        s.turnNo += 2
        g.attack(d,
            t)
        assert.equal(d.shield,
            Math.round(0.08 * d.maxHp))
    })
test("Vọng Âm Luden: chiêu chí mạng ×2,25; lá trả >= 30 mana gây sát thương -> thêm 30 + 20% AP phép lên mục tiêu chính",
    () => {
        const s = mk()
        const lux = u(s,
            "A",
            "lux")
        const g = equip(s,
            lux,
            "ban_dong_hanh_luden")
        assert.equal(cg.CARD_ITEMS.ban_dong_hanh_luden.spellCritMult,
            2.25)
        const lp = new Game(mk())
        const lux0 = u(lp.s,
            "A",
            "lux")
        const eDef = cg.getHero("lux")!.skills.E, eCard = lp.skillCard("lux",
            "A",
            "E")
        const c0 = lp.manaCost(lux0,
            eDef,
            eCard)
        lp.equip(lux0,
            "ban_dong_hanh_luden")
        assert.equal(lp.manaCost(lux0,
            eDef,
            eCard),
        Math.max(0,
            c0 - 5),
        "loại 1: rẻ hơn 5")
        const t = u(s,
            "B",
            "garen")
        g.rand = () => 0.99
        s.teamMana.A = 200
        const card = fakeCard("lux_e",
            "c90",
            "lux")
        const skill = cg.getHero("lux")!.skills.E
        const echo = () => dmgEvents(g).filter((e) => e.src === lux.id && e.tag === "effect" && e.kind === "magic").length
        g.spendMana(lux,
            20,
            card)
        casting(g,
            lux,
            "lux_e",
            "c90")
        hit(g,
            lux,
            t,
            10,
            "skill")
        g.hook("onCast",
            {
                caster: lux, card, skill, target: t
            })
        assert.equal(echo(),
            0,
            "trả < 30")
        const c2 = fakeCard("lux_e",
            "c91",
            "lux")
        g.spendMana(lux,
            30,
            c2)
        casting(g,
            lux,
            "lux_e",
            "c91")
        hit(g,
            lux,
            t,
            10,
            "skill")
        g.hook("onCast",
            {
                caster: lux, card: c2, skill, target: t
            })
        assert.equal(echo(),
            1)
    })

G("Hàng Giáp Lưới")
test("Giáp Gai: kẻ đánh nhận 15 + 25% Giáp phép; 2 đòn trong lượt -> 80 Khiên vàng",
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
        assert.equal(back[0].amount,
            Math.round((15 + 0.25 * g.armor(d)) * (100 / (100 + g.mr(t)))))
        assert.equal(g.shieldOf(d,
            "physical"),
        0)
        g.attack(t,
            d)
        assert.equal(g.shieldOf(d,
            "physical"),
        80)
    })
test("Thú Tượng Thạch Giáp: mỗi tướng địch khác nhau +5 Giáp/KP trong lượt; chịu cả vật lý + phép -> Khiên 60 + 20% AP",
    () => {
        const s = mk()
        const d = u(s,
            "A",
            "darius")
        const g = equip(s,
            d,
            "giap_gargoyle")
        const a0 = g.armor(d), m0 = g.mr(d)
        g.damage(u(s,
            "B",
            "garen"),
        d,
        10,
        "physical")
        g.damage(u(s,
            "B",
            "garen"),
        d,
        10,
        "physical")
        assert.equal(g.armor(d),
            a0 + 5)
        assert.equal(d.shield,
            0)
        g.damage(u(s,
            "B",
            "ashe"),
        d,
        10,
        "magic")
        assert.equal(g.armor(d),
            a0 + 10)
        assert.equal(g.mr(d),
            m0 + 10)
        assert.equal(d.shield,
            60)
        s.turnNo += 2
        assert.equal(g.armor(d),
            a0,
            "hết lượt")
    })
test("Áo Choàng Lửa: đầu lượt địch đối diện ±1 nhận 3% máu tối đa người đeo; đòn đánh lên địch vừa bị đốt -> Vết Thương Sâu",
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
        assert.equal(h0 - garen.hp,
            Math.round(0.03 * d.maxHp * (100 / (100 + g.mr(garen)))))
        assert.ok(ashe.hp < 100000)
        g.attack(d,
            garen)
        assert.ok(g.has(garen,
            "grievous"))
    })
test("Lời Thề Hiệp Sĩ: 20% sát thương lên đồng minh liên kết chuyển sang người đeo; lần đầu mỗi lượt đội hồi 10 mana",
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
        s.teamMana.A = 100
        const lh = lux.hp, dh = d.hp
        hit(g,
            t,
            d,
            1000)
        assert.equal(dh - d.hp,
            800)
        assert.equal(lh - lux.hp,
            200)
        assert.equal(s.teamMana.A,
            110)
        hit(g,
            t,
            d,
            1000)
        assert.equal(s.teamMana.A,
            110,
            "1 lần/lượt")
        assert.equal(cg.CARD_ITEMS.loi_the_ho_ve.shareDamage,
            undefined)
    })

G("Hàng Áo Choàng Bạc")
test("Vuốt Rồng: cuối lượt hồi 5% máu tối đa; sau lá chiêu địch gây sát thương phép -> 70 Khiên xanh",
    () => {
        const s = mk()
        const lux = u(s,
            "A",
            "lux")
        const g = equip(s,
            lux,
            "vuot_rong")
        lux.hp = 50000
        g.hook("onTurnEnd",
            {
                side: "A"
            })
        assert.equal(lux.hp,
            55000)
        const t = u(s,
            "B",
            "garen")
        const card = fakeCard("garen_q",
            "c20",
            "garen",
            "B")
        casting(g,
            t,
            "garen_q",
            "c20")
        g.damage(t,
            lux,
            100,
            "magic",
            {
                tag: "skill"
            })
        assert.equal(g.shieldOf(lux,
            "magic"),
        0,
        "chờ lá giải quyết xong")
        g.hook("onCast",
            {
                caster: t, card, skill: cg.getHero("garen")!.skills.Q, target: lux
            })
        assert.equal(g.shieldOf(lux,
            "magic"),
        70)
    })
test("Giáp Vai Nguyệt Thần: địch đối diện nhận thêm 15% từ đồng minh khác; khống chế -> lá chiêu đồng minh bỏ qua 15 KP (1 lá)",
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
            "khien_hu_vo")
        const garen = u(s,
            "B",
            "garen")
        assert.equal(hit(g,
            lux,
            garen,
            1000),
        1150)
        assert.equal(hit(g,
            d,
            garen,
            1000),
        1000,
        "chính người đeo không tính")
        assert.equal(hit(g,
            lux,
            u(s,
                "B",
                "ashe"),
            1000),
        1000)
        casting(g,
            d,
            "darius_e",
            "c40")
        g.status(garen,
            "stun",
            1)
        casting(g,
            lux,
            "lux_q",
            "c41")
        const a1 = g.damage(lux,
            garen,
            1000,
            "magic",
            {
                tag: "skill"
            })
        const a1b = g.damage(lux,
            garen,
            1000,
            "magic",
            {
                tag: "skill"
            })
        casting(g,
            lux,
            "lux_e",
            "c42")
        const a2 = g.damage(lux,
            garen,
            1000,
            "magic",
            {
                tag: "skill"
            })
        assert.equal(a1,
            a1b,
            "cùng lá")
        assert.ok(a1 > a2,
            `${a1} > ${a2}`)
    })
test("Mũ Thích Nghi: lá chiêu địch đầu tiên mỗi lượt -30% (mọi gói của lá); lá phản ứng giải quyết -> đội hồi 10 mana",
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
        casting(g,
            t,
            "garen_q",
            "c10")
        assert.equal(hit(g,
            t,
            lux,
            1000,
            "skill"),
        700)
        assert.equal(hit(g,
            t,
            lux,
            1000,
            "skill"),
        700)
        assert.equal(hit(g,
            t,
            lux,
            1000,
            "attack"),
        1000)
        casting(g,
            t,
            "garen_e",
            "c11")
        assert.equal(hit(g,
            t,
            lux,
            1000,
            "skill"),
        1000)
        s.teamMana.A = 100
        const card = fakeCard("lux_q",
            "c12",
            "lux")
        const skill = cg.getHero("lux")!.skills.Q
        g.hook("onCast",
            {
                caster: lux, card, skill
            })
        assert.equal(s.teamMana.A,
            100,
            "lá gốc không tính")
        g.emit({
            t: "chainResolve", n: 2, side: "A", card
        })
        g.hook("onCast",
            {
                caster: lux, card, skill
            })
        assert.equal(s.teamMana.A,
            110)
    })

G("Hàng Đai / Nước Mắt")
test("Giáp Máu Warmog: +250 Máu; đầu lượt hồi 10% nếu không mất máu ở lượt địch; hồi dư thành Khiên (tối đa 15%)",
    () => {
        const s = mk()
        const d = u(s,
            "A",
            "darius")
        const g = new Game(s)
        const hp0 = g.stats(d).hp
        g.equip(d,
            "giap_warmog")
        assert.equal(g.stats(d).hp,
            hp0 + 250)
        d.maxHp = 100000; d.hp = 50000
        g.hook("onTurnStart",
            {
                side: "A"
            })
        assert.equal(d.hp,
            60000)
        s.active = "B"; s.turnNo++
        hit(g,
            u(s,
                "B",
                "garen"),
            d,
            100)
        s.active = "A"; s.turnNo++
        const h = d.hp
        g.hook("onTurnStart",
            {
                side: "A"
            })
        assert.equal(d.hp,
            h,
            "mất máu ở lượt địch")
        s.turnNo += 2
        d.hp = d.maxHp; d.shield = 0
        g.hook("onTurnStart",
            {
                side: "A"
            })
        assert.equal(d.shield,
            5000)
        s.turnNo += 2
        g.hook("onTurnStart",
            {
                side: "A"
            })
        assert.equal(d.shield,
            10000)
        s.turnNo += 2
        g.hook("onTurnStart",
            {
                side: "A"
            })
        assert.equal(d.shield,
            15000,
            "trần 15%")
    })
test("Dây Chuyền Chuộc Tội: hồi máu/Khiên ban ra +20%; chiêu hồi 2 đồng minh khác nhau trong lượt -> lấy Q/E từ mộ (hồi 3 lượt)",
    () => {
        const s = mk()
        const d = u(s,
            "A",
            "darius")
        const lux = u(s,
            "A",
            "lux")
        const g = equip(s,
            lux,
            "day_chuyen_chuoc_toi")
        assert.equal(g.givenMult(lux),
            1.2)
        d.hp = 500; lux.hp = 500
        const q = g.skillCard("lux",
            "A",
            "Q")
        s.players.A.grave = [q]
        assert.equal(g.heal(lux,
            d,
            100),
        120,
        "ngoài chiêu: không tính")
        assert.equal(s.players.A.hand.length,
            0)
        casting(g,
            lux,
            "lux_e",
            "c30")
        g.heal(lux,
            d,
            100)
        assert.equal(s.players.A.hand.length,
            0)
        g.heal(lux,
            lux,
            100)
        assert.deepEqual(s.players.A.hand.map((c) => c.uid),
            [q.uid])
        s.players.A.grave = [g.skillCard("lux",
            "A",
            "E")]
        s.turnNo += 2
        g.heal(lux,
            d,
            10)
        g.heal(lux,
            lux,
            10)
        assert.equal(s.players.A.hand.length,
            1,
            "hồi chiêu")
    })
test("Bùa Xanh: không chỉ số; đội hồi thêm 10 mỗi lượt (loại 2) và chiêu người đeo rẻ hơn 5 (loại 1); bể vẫn 200",
    () => {
        const s = mk()
        const lux = u(s,
            "A",
            "lux")
        const g = new Game(s)
        const def = cg.getHero("lux")!.skills.E
        const card = g.skillCard("lux",
            "A",
            "E")
        const rg = g.manaRegen(lux), cost = g.manaCost(lux,
            def,
            card)
        g.equip(lux,
            "bua_lam")
        assert.deepEqual(cg.CARD_ITEMS.bua_lam.stats,
            {
            })
        assert.equal(g.maxMana(lux),
            cg.RULES.teamManaMax)
        assert.equal(g.manaRegen(lux),
            rg + 10)
        assert.equal(g.manaCost(lux,
            def,
            card),
        Math.max(0,
            cost - 5))
        g.kill(lux,
            u(s,
                "B",
                "garen"))
        assert.equal(g.teamManaRegen("A"),
            rg,
            "người đeo chết: mất hồi thêm")
    })
test("Dây Chuyền Chuộc Tội (loại 1): chiêu hồi máu/tạo Khiên của người đeo rẻ hơn 10, chiêu khác không đổi",
    () => {
        const s = mk()
        const lux = u(s,
            "A",
            "lux")
        const g = equip(s,
            lux,
            "day_chuyen_chuoc_toi")
        const card = g.skillCard("lux",
            "A",
            "Q")
        const mkDef = (desc: string) => ({
            key: "Q", name: "x", desc, target: "none", mana: 30, resolve: () => {}
        }) as cg.SkillDef
        assert.equal(g.manaCost(lux,
            mkDef("Hồi {50} máu cho 1 đồng minh."),
            card),
        20)
        assert.equal(g.manaCost(lux,
            mkDef("Tạo Khiên {60}."),
            card),
        20)
        assert.equal(g.manaCost(lux,
            mkDef("Gây {80} sát thương phép."),
            card),
        30)
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
