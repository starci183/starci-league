// Đổi chi phí mana của một chiêu: node scripts/balance/set_mana.mjs <hero> <Q|E|R> <mana>
// Chỉ đổi khi chiêu khai báo `mana: <số>` (chi phí cố định); chi phí động (hàm) thì báo lỗi để sửa tay.
import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const [hero, key, val] = process.argv.slice(2)
const p = join(import.meta.dirname, "../../packages/shared/src/cardgame/heroes", `${hero}.ts`)
const src = readFileSync(p, "utf8")
// khối chiêu bắt đầu ở `key: "Q"` (trong cùng object), lấy `mana: số` đầu tiên trong 400 ký tự quanh đó
const at = src.indexOf(`key: "${key}"`)
if (at < 0) throw new Error(`${hero}: không thấy key ${key}`)
const from = Math.max(0, src.lastIndexOf("{", at))
const win = src.slice(from, at + 400)
const m = win.match(/mana:\s*(\d+)\s*,/)
if (!m) throw new Error(`${hero} ${key}: mana không phải số cố định`)
const pos = from + win.indexOf(m[0])
const out = src.slice(0, pos) + `mana: ${val},` + src.slice(pos + m[0].length)
writeFileSync(p, out)
console.log(`${hero} ${key}: mana ${m[1]} → ${val}`)
