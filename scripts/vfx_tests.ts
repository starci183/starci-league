// Kiểm tra hợp đồng thư viện: mọi tướng/phép đều trỏ tới hiệu ứng đã đăng ký.
// Không cần DOM, GPU hay server. Chạy: npx tsx scripts/vfx_tests.ts
import {
    strict as assert
} from "node:assert"
import {
    cg
} from "@starci/shared"
import {
    VFX_CATALOG, validateVfx
} from "../packages/client/src/card/vfx/catalog"
import {
    styleFor, styleSequenceFor
} from "../packages/client/src/card/vfx/dispatch"
import {
    BASIC_ACTION_VFX, heroBasicVfx, heroBasicVfxSequence, heroVfxEntries, skillVfx, spellVfxEntries
} from "../packages/client/src/card/vfx/heroMap"
import {
    getVfx, vfxNames
} from "../packages/client/src/card/vfx/types"

let passed = 0
// E là thao tác cộng stack: không dựng lính độc lập hay giả hiệu ứng lướt.
test("Azir stack không dùng VFX lính đứng đường hoặc lướt ở E",
    () => {
        const e = skillVfx("azir",
            "e")
        assert.equal(e.travel,
            "none")
        assert.equal(e.impact,
            "none")
        const p = skillVfx("azir",
            "p")
        assert.equal(p.cast,
            undefined)
        assert.equal(p.extra,
            undefined)
        assert.equal(p.impact,
            "azirStab")
    })
function test(name: string, fn: () => void) {
    fn()
    passed++
    console.log(`PASS ${name}`)
}

test("Roster engine, mapping chiêu và catalog không có tham chiếu thiếu",
    () => {
        assert.deepEqual(validateVfx(),
            [])
        assert.equal(heroVfxEntries().length,
            cg.implementedHeroes().length)
        assert.equal(VFX_CATALOG.length,
            vfxNames().length)
    })

test("Mọi bộ Đánh/P/Q/E/R có màu hữu hạn và cả ba nhịp đã đăng ký",
    () => {
        for (const hero of cg.implementedHeroes()) {
            const styles = [...heroBasicVfxSequence(hero.id,
                hero.damage,
                hero.role),
            ...(["p",
                "q",
                "e",
                "r"] as const).map((key) => skillVfx(hero.id,
                key))]
            for (const style of styles) {
                assert.ok(Number.isFinite(style.color))
                assert.ok(style.color >= 0 && style.color <= 0xffffff)
                for (const name of [style.travel,
                    style.impact,
                    style.cast]) if (name) assert.ok(getVfx(name),
                    `${hero.id}: ${name}`)
            }
        }
    })

test("Đòn thường theo vai: sát thủ chém, đấu sĩ đâm, pháp sư/cầu trợ thủ, cung và va đập",
    () => {
        assert.equal(heroBasicVfx("ashe").travel,
            "basicFrostArrow")
        assert.equal(heroBasicVfx("jinx").travel,
            "basicMinigun")
        assert.equal(heroBasicVfx("garen").travel,
            "basicSwordSwing")
        assert.equal(heroBasicVfx("darius").travel,
            "basicAxeChop")
        assert.equal(heroBasicVfx("katarina").travel,
            "basicDaggerFlurry")
        assert.equal(heroBasicVfx("annie").travel,
            "basicFlameBolt")
        assert.equal(heroBasicVfx("janna").travel,
            "jannaGust")
        assert.equal(heroBasicVfx("leona").travel,
            "basicSunBlade")
        assert.equal(heroBasicVfx("kogmaw").travel,
            "basicAcidSpit")
        assert.equal(heroBasicVfx("teemo").travel,
            "basicBlowdart")
        assert.equal(heroBasicVfx("blitzcrank").travel,
            "basicSteamFist")
    })

test("Một đòn có danh sách N VFX; thêm cue không làm mất cue trước hoặc sửa cấu hình gốc",
    () => {
        assert.deepEqual(Object.keys(BASIC_ACTION_VFX).sort(),
            ["assassin",
                "fighter",
                "mage",
                "marksman",
                "support",
                "tank"])
        for (const recipe of Object.values(BASIC_ACTION_VFX)) assert.equal(recipe.length,
            1)
        const fighter = BASIC_ACTION_VFX.fighter
        const extra = {
            ...fighter[0], travel: "assassinSlashes"
        }
        fighter.push(extra)
        try {
            const resolved = styleSequenceFor(undefined,
                "physical",
                false)
            assert.deepEqual(resolved.map(cue => cue.travel),
                ["daggerStab",
                    "assassinSlashes"])
            resolved[0].travel = "none"
            assert.equal(fighter[0].travel,
                "daggerStab")
            assert.equal(fighter.length,
                2)
        } finally { fighter.pop() }
    })

test("Dispatcher dùng mapping nội tại P và đòn riêng của tướng",
    () => {
        const passive: cg.Card = {
            uid: "vfx-test", kind: "skill", id: "brand_p", hero: "brand"
        }
        assert.equal(styleFor(passive,
            "magic",
            false,
            "brand").impact,
        "burn")
        assert.equal(styleFor(undefined,
            "physical",
            false,
            "jinx").travel,
        "basicMinigun")
        assert.equal(styleFor(undefined,
            "physical",
            true,
            "ashe").intensity,
        2)
    })

test("Lux Q, Yorick R và miễn sát thương Janna R có hình ảnh đúng loại",
    () => {
        assert.equal(skillVfx("lux",
            "q").travel,
        "luxShard")
        assert.equal(skillVfx("lux",
            "q").shield,
        "luxPrism")
        assert.equal(skillVfx("yorick",
            "r").impact,
        "yorickMaidenRise")
        assert.notEqual(skillVfx("yorick",
            "r").impact,
        "summonToken")
        assert.equal(skillVfx("janna",
            "r").impact,
        "jannaMonsoonHit",
        "Janna R: Gió Mùa gives Shield and healing in one beat")
    })

test("Mọi phép bổ trợ đều có đủ travel/impact/cast hợp lệ",
    () => {
        assert.ok(spellVfxEntries().length >= 8)
        for (const [id,
            style] of spellVfxEntries()) for (const name of [style.travel,
            style.impact,
            style.cast]) if (name) assert.ok(getVfx(name),
            `${id}: ${name}`)
    })

console.log(`VFX: ${passed}/${passed} PASS · ${VFX_CATALOG.length} hiệu ứng · ${cg.implementedHeroes().length} tướng`)
