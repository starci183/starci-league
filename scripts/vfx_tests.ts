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
            "bowShot")
        assert.equal(heroBasicVfx("jinx").travel,
            "bowShot")
        assert.equal(heroBasicVfx("garen").travel,
            "daggerStab")
        assert.equal(heroBasicVfx("darius").travel,
            "daggerStab")
        assert.equal(heroBasicVfx("katarina").travel,
            "assassinSlashes")
        assert.equal(heroBasicVfx("annie").travel,
            "mageOrb")
        assert.equal(heroBasicVfx("janna").travel,
            "supportOrb")
        assert.equal(heroBasicVfx("leona").travel,
            "heavyImpact")
        assert.equal(heroBasicVfx("kogmaw").travel,
            "poisonBolt")
        assert.equal(heroBasicVfx("teemo").travel,
            "poisonBolt")
        assert.equal(heroBasicVfx("blitzcrank").travel,
            "heavyStrike")
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
                false,
                "garen")
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
        "bowShot")
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
        "none")
        assert.equal(skillVfx("lux",
            "q").impact,
        "shield")
        assert.equal(skillVfx("yorick",
            "r").impact,
        "darkPulse")
        assert.notEqual(skillVfx("yorick",
            "r").impact,
        "summonToken")
        assert.equal(skillVfx("janna",
            "r").impact,
        "invulnerability",
        "Janna R protects now; actual healing belongs to the end-turn event")
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
