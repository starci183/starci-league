// Buff/nerf hệ số chiêu: nhân mọi số trong hằng công thức F_* của một tướng với hệ số, đồng bộ chuỗi {…} trong i18n.
// Chạy: node scripts/balance/scale_formula.mjs <hero> <HẰNG> <hệ số> [--only=base|ratio]
//   base  = chỉ số phẳng (vd "35" trong "35 + 20% AD"), ratio = chỉ hệ số "x% ..."; mặc định cả hai.
import { readFileSync, readdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const [hero, name, factorRaw, ...rest] = process.argv.slice(2)
const factor = Number(factorRaw)
const only = rest.find((a) => a.startsWith("--only="))?.slice(7)
const root = join(import.meta.dirname, "../../packages/shared/src/cardgame")
const heroFile = join(root, "heroes", `${hero}.ts`)
let src = readFileSync(heroFile, "utf8")
const re = new RegExp(`((?:export )?const ${name}\\s*=\\s*")([^"]+)(")`)
const m = src.match(re)
if (!m) throw new Error(`Không thấy ${name} trong ${hero}.ts`)
const old = m[2]

const fmt = (x, comma) => {
    const r = x >= 10 ? Math.round(x) : x >= 1 ? Math.round(x * 10) / 10 : Math.round(x * 1000) / 1000
    const s = String(r)
    return comma ? s.replace(".", ",") : s
}
// mỗi số: kèm "%" ngay sau là hệ số, không có là phần phẳng
const scaled = old.replace(/(\d+(?:[.,]\d+)?)(\s*%)?/g, (all, num, pct) => {
    const isRatio = !!pct
    if (only === "base" && isRatio) return all
    if (only === "ratio" && !isRatio) return all
    const comma = num.includes(",")
    const v = Number(num.replace(",", ".")) * factor
    return fmt(v, comma) + (pct ?? "")
})
if (scaled === old) { console.log("không đổi"); process.exit(0) }
src = src.replace(re, `$1${scaled}$3`)
writeFileSync(heroFile, src)
// i18n: thay {old} bằng {new} ở mọi file (bản EN dùng cùng công thức; "máu tối đa" ↔ "max HP" thì thay riêng)
const toEn = (s) => s.replace(/máu tối đa/g, "max HP").replace(/Máu tối đa/g, "max HP")
let hits = 0
for (const dir of [join(root, "i18n"), root]) {
    for (const f of readdirSync(dir).filter((x) => x.endsWith(".ts"))) {
        const p = join(dir, f)
        let t = readFileSync(p, "utf8")
        let changed = false
        for (const [a, b] of [[old, scaled], [toEn(old), toEn(scaled)]]) {
            const key = `{${a}}`
            if (t.includes(key)) { t = t.split(key).join(`{${b}}`); changed = true; hits++ }
        }
        if (changed) writeFileSync(p, t)
    }
}
console.log(`${hero}.${name}: "${old}" → "${scaled}" (i18n: ${hits} file)`)
