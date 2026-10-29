// In mô tả (tiếng Việt) của 8 tướng: để soát công thức và viết bản Anh.
import { CARDS, HeroCard, SKILLS, getHero } from "@starci/shared";
for (const id of process.argv.slice(2)) {
  const h = CARDS[id] as HeroCard & Record<string, unknown>;
  console.log(`\n## ${id}  hp ${h.hp} giáp ${h.armor}/${h.mr} AD ${h.atk} AP ${h.ap}`);
  for (const f of ["desc", "strength", "counter", "concept"]) if (h[f]) console.log(`${f}: ${h[f]}`);
  console.log(`passive: ${getHero(id)?.passive?.name}: ${getHero(id)?.passive?.desc}`);
  for (const s of h.skills) { const k = SKILLS[s]; console.log(`${k.key} ${k.name} [${k.mana} mana, hồi ${k.cooldown}]: ${k.desc}`); (k.boosts ?? []).forEach((b, i) => console.log(`   boost.${i}: ${b}`)); }
}
