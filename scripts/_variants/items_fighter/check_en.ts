// Kiểm tra bản Anh: đồ/chiêu/tướng nào còn chữ tiếng Việt sau applyLocale("en")
import { allItems, applyLocale, SKILLS, CARDS, getHero } from "@starci/shared";
const VI = /[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i;
const only = process.argv.slice(2);
applyLocale("en");
for (const it of allItems()) it.props.forEach((p, i) => {
  for (const [k, v] of [["name", p.name], ["desc", p.desc], ["cond", p.condition.desc]] as const)
    if (p.condition.kind === "none" && k === "cond") continue; else if (VI.test(v)) console.log(`item.${it.id}.p${i}.${k}: ${v}`);
});
for (const [id, s] of Object.entries(SKILLS)) {
  if (only.length && !only.some((h) => id.startsWith(h))) continue;
  if (VI.test(s.desc)) console.log(`skill ${id}.desc: ${s.desc}`);
  (s.boosts ?? []).forEach((b, i) => { if (VI.test(b)) console.log(`skill ${id}.boost.${i}: ${b}`); });
}
for (const h of only) {
  const c = CARDS[h] as unknown as Record<string, string>;
  for (const f of ["desc", "strength", "counter", "concept"]) if (c?.[f] && VI.test(c[f])) console.log(`hero.${h}.${f}: ${c[f]}`);
  const a = getHero(h); if (a?.passive && VI.test(a.passive.desc)) console.log(`hero.${h}.passive_desc`);
}
