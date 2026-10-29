// Trích mọi câu tiếng Việt trong dữ liệu game (tướng, chiêu, đồ) ra file JSON theo khóa, để dịch sang ngôn ngữ khác.
// Khóa: hero.<id>.<trường> · skill.<id>.desc|formula|boost.<i> · item.<id>.p<i>.name|desc|cond
// Chạy: npx tsx scripts/i18n_extract.ts <thư mục ra>
import {
    mkdirSync, writeFileSync
} from "node:fs"
import {
    SKILLS, allHeroes, allItems
} from "@starci/shared"

const out = process.argv[2] ?? ".work/i18n"
mkdirSync(out,
    {
        recursive: true
    })
const heroes: Record<string, string> = {
}, skills: Record<string, string> = {
}, items: Record<string, string> = {
}
const put = (m: Record<string, string>, k: string, v?: string) => { if (v && v.trim()) m[k] = v }

for (const h of allHeroes()) {
    put(heroes,
        `hero.${h.id}.desc`,
        h.desc)
    put(heroes,
        `hero.${h.id}.strength`,
        h.strength)
    put(heroes,
        `hero.${h.id}.counter`,
        h.counter)
    put(heroes,
        `hero.${h.id}.concept`,
        h.concept)
    put(heroes,
        `hero.${h.id}.passive_desc`,
        h.passive?.desc)
    for (const s of h.skills ?? []) {
        const d = SKILLS[s.def.id]
        put(skills,
            `skill.${d.id}.desc`,
            d.desc)
        put(skills,
            `skill.${d.id}.formula`,
            d.formula);
        (d.boosts ?? []).forEach((b, i) => put(skills,
            `skill.${d.id}.boost.${i}`,
            b))
    }
}
for (const it of allItems()) {
    it.props.forEach((p, i) => {
        if (!p.desc && !p.name) return
        put(items,
            `item.${it.id}.p${i}.name`,
            p.name)
        put(items,
            `item.${it.id}.p${i}.desc`,
            p.desc)
        if (p.condition.kind !== "none") put(items,
            `item.${it.id}.p${i}.cond`,
            p.condition.desc)
    })
}
for (const [name,
    m] of Object.entries({
        heroes, skills, items
    })) writeFileSync(`${out}/vi_${name}.json`,
    JSON.stringify(m,
        null,
        1))
console.log(`tướng ${Object.keys(heroes).length} · chiêu ${Object.keys(skills).length} · đồ ${Object.keys(items).length} câu`)
