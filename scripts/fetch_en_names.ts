// Tải tên chính thức bản tiếng Anh (Riot Data Dragon en_US): tướng, danh hiệu, chiêu Q/W/E/R, nội tại, đồ.
// Sinh ra packages/shared/src/i18n/lol_en.ts (dữ liệu, không sửa tay). Chạy: npx tsx scripts/fetch_en_names.ts
import {
    writeFileSync
} from "node:fs"
import {
    allHeroes, allItems, getHero
} from "@starci/shared"

const B = "https://ddragon.leagueoflegends.com", V = "16.21.1"
/** id trong game -> key Data Dragon */
const KEY: Record<string, string> = {
    kogmaw: "KogMaw", ashe: "Ashe", lux: "Lux", lissandra: "Lissandra", blitzcrank: "Blitzcrank", braum: "Braum", khazix: "Khazix",
    aatrox: "Aatrox", janna: "Janna", katarina: "Katarina", ahri: "Ahri", darius: "Darius", leona: "Leona", jinx: "Jinx",
    thresh: "Thresh", zed: "Zed", annie: "Annie", vayne: "Vayne", malphite: "Malphite", soraka: "Soraka",
}
/** Phần JSON Data Dragon mà script đọc tới */
interface DDragonChampion { name: string; title: string; passive: { name: string }; spells: { name: string }[] }
interface DDragonItem { name: string }
const get = async <T>(u: string) => (await fetch(u)).json() as Promise<{ data: Record<string, T> }>

const heroes: Record<string, { name: string; title: string; passive: string; skills: Record<string, string> }> = {
}
for (const h of allHeroes()) {
    const key = KEY[h.id]
    if (!key) throw new Error(`Thiếu key Data Dragon cho ${h.id}`)
    const d = (await get<DDragonChampion>(`${B}/cdn/${V}/data/en_US/champion/${key}.json`)).data[key]
    const skills: Record<string, string> = {
    }
    for (const s of getHero(h.id)!.skills ?? []) skills[s.def.id] = d.spells["QWER".indexOf(s.def.key)].name
    heroes[h.id] = {
        name: d.name, title: d.title, passive: d.passive.name, skills
    }
}
const itemData = (await get<DDragonItem>(`${B}/cdn/${V}/data/en_US/item.json`)).data
const items: Record<string, string> = {
}
for (const it of allItems()) {
    const lol = it.lolIds?.[0]
    if (lol && itemData[lol]) items[it.id] = itemData[lol].name
}
const body = `// Sinh tự động bởi scripts/fetch_en_names.ts từ Riot Data Dragon ${V} (en_US). Không sửa tay.
export const LOL_EN = ${JSON.stringify({
        heroes, items
    },
    null,
    2)} as const;
`
writeFileSync("packages/shared/src/i18n/lol_en.ts",
    body)
console.log(`${Object.keys(heroes).length} tướng, ${Object.keys(items).length} đồ`)
