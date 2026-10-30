// Đối chiếu bản tuning 33 tướng (JSON) với source: chỉ số gốc + mana Q/E/R.
// Chạy: npx tsx scripts/balance/check_tuning.ts <tuning.json>
import {
    readFileSync
} from "node:fs"
import {
    cg
} from "@starci/shared"

type Tuned = { id: string; base_stats: { hp: number; ad: number; armor: number; mr: number }; mana: Record<"Q" | "E" | "R", number> }
const tuning = JSON.parse(readFileSync(process.argv[2],
    "utf8")) as { heroes: Tuned[] }
const implemented = new Set(cg.implementedHeroes().map((h) => h.id))
let bad = 0
for (const t of tuning.heroes) {
    const h = cg.getHero(t.id)
    if (!h) { console.log(`${t.id}: THIẾU trong source`); bad++; continue }
    const diffs: string[] = []
    const cmp = (k: string, a: unknown, b: unknown) => { if (a !== b) diffs.push(`${k} ${a}→${b}`) }
    cmp("hp", h.hp, t.base_stats.hp)
    cmp("ad", h.atk, t.base_stats.ad)
    cmp("armor", h.armor, t.base_stats.armor)
    cmp("mr", h.mr, t.base_stats.mr)
    for (const k of ["Q", "E", "R"] as const) {
        const m = h.skills[k].mana
        cmp(`mana${k}`, typeof m === "function" ? "fn" : m, t.mana[k])
    }
    if (!implemented.has(t.id)) diffs.push("chưa implemented")
    if (diffs.length) { bad++; console.log(`${t.id}: ${diffs.join(", ")}`) }
}
console.log(`${tuning.heroes.length} tướng, ${bad} lệch`)
