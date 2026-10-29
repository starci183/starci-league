// Tải icon đồ LMHT từ Riot Data Dragon cho mọi món trong game (theo lolIds, thử lần lượt).
// Chạy: npx tsx scripts/fetch_items.ts
import {
    mkdirSync, writeFileSync
} from "node:fs"
import {
    allItems
} from "@starci/shared"

const BASE = "https://ddragon.leagueoflegends.com"
const OUT = new URL("../packages/client/public/items/",
    import.meta.url)
mkdirSync(OUT,
    {
        recursive: true
    })

const version: string = (await (await fetch(`${BASE}/api/versions.json`)).json())[0]
const data: Record<string, { name: string }> = (await (await fetch(`${BASE}/cdn/${version}/data/vi_VN/item.json`)).json()).data
const PNG = [0x89,
    0x50,
    0x4e,
    0x47]

let ok = 0
const missing: string[] = []
for (const item of allItems()) {
    const lolId = item.lolIds?.find((id) => data[String(id)])
    if (!lolId) { missing.push(item.name); continue }
    const buf = new Uint8Array(await (await fetch(`${BASE}/cdn/${version}/img/item/${lolId}.png`)).arrayBuffer())
    if (!PNG.every((b, i) => buf[i] === b)) { missing.push(item.name); continue }
    writeFileSync(new URL(`${item.id}.png`,
        OUT),
    buf)
    ok++
}
console.log(`Data Dragon ${version}: ${ok}/${allItems().length} icon`)
if (missing.length) console.log("Không có icon LMHT (dùng biểu tượng dự phòng):",
    missing.join(", "))
