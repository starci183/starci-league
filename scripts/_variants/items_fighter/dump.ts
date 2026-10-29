import { SKILLS, CARDS } from "@starci/shared";
for (const h of ["aatrox", "darius", "zed", "katarina", "khazix"]) {
  for (const id of (CARDS[h] as any).skills) { const s = SKILLS[id]; console.log(`${id} [${s.mana}/${s.cooldown}] ${s.desc}`); (s.boosts ?? []).forEach((b, i) => console.log(`  ${i}: ${b}`)); }
}
