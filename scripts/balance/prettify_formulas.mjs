// Làm tròn đẹp mọi công thức F_* của tướng và đồng bộ chuỗi {…} tương ứng trong i18n.
// Phần phẳng: ≥10 → bội 5, 1..10 → số nguyên, <1 → bước 0,05. Hệ số %: ≥10 → bội 5, 2..10 → nguyên, 1..2 → bước 0,5, <1 → bước 0,05.
// Chạy: node scripts/balance/prettify_formulas.mjs [--dry]
import { readFileSync, readdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const dry = process.argv.includes("--dry")
const root = join(import.meta.dirname, "../../packages/shared/src/cardgame")
const step = (x, s) => Math.round(x / s) * s
function nice(x, pct) {
    let v
    if (pct) v = x >= 10 ? step(x, 5) : x >= 2 ? Math.round(x) : x >= 1 ? step(x, 0.5) : step(x, 0.05)
    else v = x >= 10 ? step(x, 5) : x >= 1 ? Math.round(x) : step(x, 0.05)
    if (v === 0 && x > 0) v = pct ? 0.05 : 0.05
    return Math.round(v * 1000) / 1000
}
const NUM = /(\d+(?:[.,]\d+)?)(\s*%)?/g
const numsOf = (s) => [...s.matchAll(NUM)].map((m) => m[1].replace(",", "."))
function prettify(s) {
    return s.replace(NUM, (all, num, pct) => {
        const comma = num.includes(",")
        const v = nice(Number(num.replace(",", ".")), !!pct)
        const t = String(v)
        return (comma ? t.replace(".", ",") : t) + (pct ?? "")
    })
}

const changes = [] // [old, new]
const heroDir = join(root, "heroes")
for (const f of readdirSync(heroDir).filter((x) => x.endsWith(".ts"))) {
    const p = join(heroDir, f)
    let src = readFileSync(p, "utf8")
    src = src.replace(/((?:export )?const F_[A-Z0-9_]*\s*=\s*")([^"]+)(")/g, (all, a, body, c) => {
        const nb = prettify(body)
        if (nb !== body) changes.push({ hero: f.replace(".ts", ""), old: body, neu: nb })
        return a + nb + c
    })
    if (!dry) writeFileSync(p, src)
}
// i18n: thay {…} có dãy số trùng công thức cũ của tướng (bản EN khác chữ nhưng cùng số)
const map = new Map(changes.map((c) => [numsOf(c.old).join("|"), c]))
let hits = 0
for (const dir of [join(root, "i18n"), root]) {
    for (const f of readdirSync(dir).filter((x) => x.endsWith(".ts"))) {
        const p = join(dir, f)
        const t = readFileSync(p, "utf8")
        const nt = t.replace(/\{([^{}]*\d[^{}]*)\}/g, (all, body) => {
            if (!map.has(numsOf(body).join("|"))) return all
            hits++
            return `{${prettify(body)}}`
        })
        if (nt !== t && !dry) writeFileSync(p, nt)
    }
}
for (const c of changes) console.log(`${c.hero}: ${c.old}  →  ${c.neu}`)
console.log(`${changes.length} công thức, ${hits} chỗ i18n`)
