// Helper cho test: đọc chuỗi công thức (const F_* = "...") ngay từ file tướng, kể cả hằng không export,
// để test tính kỳ vọng bằng g.f(unit, HF("ashe", "F_Q")) và không vỡ khi cân bằng lại số.
// Không phải file test (không khớp regex runner trong card_tests.ts).
import fs from "node:fs"
import path from "node:path"
import {
    fileURLToPath
} from "node:url"

const HEROES = path.join(path.dirname(fileURLToPath(import.meta.url)),
    "../packages/shared/src/cardgame/heroes")
const cache = new Map<string, string>()
function src(hero: string): string {
    let s = cache.get(hero)
    if (s === undefined) {
        s = fs.readFileSync(path.join(HEROES,
            `${hero}.ts`),
        "utf8")
        cache.set(hero,
            s)
    }
    return s
}

/** Chuỗi công thức `name` trong heroes/<hero>.ts (vd HF("ashe", "F_Q") = "55 + 200% AD + 25% AP") */
export function HF(hero: string, name: string): string {
    const m = src(hero).match(new RegExp(`(?:export\\s+)?const\\s+${name}\\s*=\\s*"([^"]*)"`))
    if (!m) throw new Error(`không thấy ${hero}.${name}`)
    return m[1]
}

/** Hằng số (const X = 0.25) trong heroes/<hero>.ts */
export function HN(hero: string, name: string): number {
    const m = src(hero).match(new RegExp(`(?:export\\s+)?const\\s+${name}\\s*=\\s*(-?[0-9.]+)`))
    if (!m) throw new Error(`không thấy ${hero}.${name}`)
    return Number(m[1])
}
