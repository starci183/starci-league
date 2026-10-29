// So số dòng boost tiếng Việt với số khoá .boost.<i> tiếng Anh, và khoá hero.* thiếu
import { SKILLS, allHeroes } from "@starci/shared";
import { TEXT_EN } from "../../../packages/shared/src/i18n/text_en";
for (const [id, s] of Object.entries(SKILLS)) {
  const n = (s.boosts ?? []).length;
  const en = Object.keys(TEXT_EN).filter((k) => k.startsWith(`skill.${id}.boost.`)).length;
  if (n !== en) console.log(`${id}: vi ${n} boost, en ${en}`);
  if (!TEXT_EN[`skill.${id}.desc`]) console.log(`${id}: thiếu desc`);
}
for (const h of allHeroes()) for (const f of ["desc", "strength", "counter", "passive_desc"]) if (!TEXT_EN[`hero.${h.id}.${f}`]) console.log(`hero.${h.id}.${f} thiếu`);
