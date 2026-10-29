// Kiểm tra bảng HERO_BUILDS: đủ 20 tướng, mọi id là đồ huyền thoại có thật.
import { HERO_BUILDS, getItem, allHeroes } from "@starci/shared";

for (const h of allHeroes()) if (!HERO_BUILDS[h.id]) console.log("thiếu build:", h.id);
for (const [h, ids] of Object.entries(HERO_BUILDS))
  for (const id of ids) if (!getItem(id) || getItem(id)!.tier !== "legendary") console.log("sai món:", h, id);
console.log("ok");
