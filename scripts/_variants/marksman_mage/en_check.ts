// Soát bản Anh 8 tướng: đủ khóa desc/boost, câu điều kiện đã dịch, mở đầu bằng câu mục tiêu.
import { CARDS, HeroCard, SKILLS, applyLocale } from "@starci/shared";
import { TEXT_EN } from "../../../packages/shared/src/i18n/text_en";
const ids = ["kogmaw", "vayne", "ashe", "jinx", "ahri", "annie", "lissandra", "lux"];
const T = TEXT_EN as Record<string, string>;
const viBoosts = Object.fromEntries(ids.flatMap((h) => (CARDS[h] as HeroCard).skills.map((s) => [s, SKILLS[s].boosts?.length ?? 0])));
applyLocale("en");
let bad = 0;
for (const h of ids) {
  for (const k of ["desc", "strength", "passive_desc"]) if (!T[`hero.${h}.${k}`]) { console.log("thiếu", `hero.${h}.${k}`); bad++; }
  for (const s of (CARDS[h] as HeroCard).skills) {
    const d = T[`skill.${s}.desc`];
    if (!d) { console.log("thiếu", s); bad++; continue; }
    if (!/^(Choose|Self\.|No target)/.test(d)) { console.log("không mở bằng câu mục tiêu:", s, d.slice(0, 40)); bad++; }
    for (let i = 0; i < viBoosts[s]; i++) if (!T[`skill.${s}.boost.${i}`]) { console.log("thiếu", `skill.${s}.boost.${i}`); bad++; }
    if (T[`skill.${s}.boost.${viBoosts[s]}`]) { console.log("thừa", `skill.${s}.boost.${viBoosts[s]}`); bad++; }
    for (const b of SKILLS[s].boosts ?? []) if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(b)) { console.log("còn tiếng Việt:", s, b); bad++; }
  }
}
console.log(bad ? `${bad} lỗi` : "EN OK");
