# Luật riêng cho mỗi vai (thầy duyệt): Kiên Cố (đỡ đòn), Lướt (sát thủ với tới mọi hàng cùng đường), Bắn Tỉa (xạ thủ), Hỗ Trợ (trợ thủ)
import os, sys
ROOT = sys.argv[1]
def edit(rel, a, b):
    p = os.path.join(ROOT, rel); s = open(p, encoding="utf-8").read()
    assert s.count(a) == 1, (rel, a[:70], s.count(a)); open(p, "w", encoding="utf-8").write(s.replace(a, b))

# 1) mô tả luật vai trong ROLE_INFO
edit("packages/shared/src/cards.ts", '''export const ROLE_INFO: Record<Role, { name: string; rows: Row[]; range: number }> = {
  tank: { name: "Đỡ đòn", rows: ["front", "mid"], range: 2 },
  fighter: { name: "Đấu sĩ", rows: ["front", "mid"], range: 2 },
  assassin: { name: "Sát thủ", rows: ["front", "mid", "back"], range: 3 },
  mage: { name: "Pháp sư", rows: ["mid", "back"], range: 4 },
  marksman: { name: "Xạ thủ", rows: ["mid", "back"], range: 4 },
  support: { name: "Trợ thủ", rows: ["front", "mid", "back"], range: 3 },
};''', '''export const ROLE_INFO: Record<Role, { name: string; rows: Row[]; range: number; perk: string }> = {
  tank: { name: "Đỡ đòn", rows: ["front", "mid"], range: 2, perk: "Kiên Cố: đứng tiền tuyến nhận ít hơn 10% sát thương." },
  fighter: { name: "Đấu sĩ", rows: ["front", "mid"], range: 2, perk: "Chặn đường: sát thủ địch đánh vượt qua đấu sĩ đứng trước trong cùng đường bị phản 50% AD của đấu sĩ." },
  assassin: { name: "Sát thủ", rows: ["front", "mid", "back"], range: 3, perk: "Lướt: đánh thường với tới mọi hàng trong cùng đường, ưu tiên xạ thủ/pháp sư và gây thêm 20% sát thương lên họ." },
  mage: { name: "Pháp sư", rows: ["mid", "back"], range: 4, perk: "Phép lan: đánh thường gây sát thương phép, lan 50% sang tướng địch đứng kề mục tiêu." },
  marksman: { name: "Xạ thủ", rows: ["mid", "back"], range: 4, perk: "Bắn Tỉa: đánh thường gây thêm 10% sát thương lên mục tiêu lượt trước không di chuyển." },
  support: { name: "Trợ thủ", rows: ["front", "mid", "back"], range: 3, perk: "Hỗ Trợ: khiên và hồi máu của trợ thủ mạnh hơn 15% lên đồng minh đứng kề." },
};''')
edit("packages/shared/src/i18n/index.ts",
     '''const ROLE_EN: Record<Role, string> = { tank: "Tank", fighter: "Fighter", assassin: "Assassin", mage: "Mage", marksman: "Marksman", support: "Support" };''',
     '''const ROLE_EN: Record<Role, string> = { tank: "Tank", fighter: "Fighter", assassin: "Assassin", mage: "Mage", marksman: "Marksman", support: "Support" };
const ROLE_PERK_EN: Record<Role, string> = {
  tank: "Steadfast: takes 10% less damage while in the front row.",
  fighter: "Roadblock: enemy assassins attacking past a fighter standing in front of them in the same lane take 50% of the fighter's AD.",
  assassin: "Dash: basic attacks reach every row of the same lane, prefer marksmen/mages and deal 20% more damage to them.",
  mage: "Splash: basic attacks deal magic damage and splash 50% to enemies next to the target.",
  marksman: "Sniper: basic attacks deal 10% more damage to a target that did not move last turn.",
  support: "Helping Hand: the support's shields and heals are 15% stronger on adjacent allies.",
};''')
edit("packages/shared/src/i18n/index.ts",
     '''  for (const [role, name] of Object.entries(ROLE_EN)) (ROLE_INFO[role as Role] as { name: string }).name = name;''',
     '''  for (const [role, name] of Object.entries(ROLE_EN)) (ROLE_INFO[role as Role] as { name: string }).name = name;
  for (const [role, perk] of Object.entries(ROLE_PERK_EN)) (ROLE_INFO[role as Role] as { perk: string }).perk = perk;''')

# 2) Kiên Cố: hệ số sát thương nhận
edit("packages/shared/src/helpers.ts", '''export const damageTakenMult = (u: UnitLike) =>
  (Object.keys(STATUS_INFO) as StatusId[]).reduce((m, s) => (hasStatus(u, s) ? m * STATUS_INFO[s].damageTaken : m), 1);''',
'''export const damageTakenMult = (u: UnitLike) =>
  (Object.keys(STATUS_INFO) as StatusId[]).reduce((m, s) => (hasStatus(u, s) ? m * STATUS_INFO[s].damageTaken : m), 1)
  * (roleOf(u) === "tank" && u.row === "front" ? 0.9 : 1); // Kiên Cố''')

# 3) Lướt: sát thủ với tới mọi hàng cùng đường
edit("packages/shared/src/rules.ts", '''  let pool = enemiesInRange(state, a);
  if (roleOf(a) === "assassin" && pool.some(isCarry)) pool = pool.filter(isCarry); // lướt vào hậu tuyến''',
'''  let pool = enemiesInRange(state, a);
  if (roleOf(a) === "assassin") {
    // Lướt: với tới mọi hàng trong cùng đường, ưu tiên xạ thủ/pháp sư
    for (const x of laneEnemies(state, e, a.lane)) if (!pool.includes(x)) pool.push(x);
    pool.sort((x, y) => distance(a, x) - distance(a, y) || x.hp - y.hp);
    if (pool.some(isCarry)) pool = pool.filter(isCarry);
  }''')
edit("packages/shared/src/rules.ts", "import { adjacent, areaCells, atkOf, damageTakenMult, hasStatus,", "import { adjacent, areaCells, atkOf, damageTakenMult, hasStatus, laneEnemies,")

# 4) Bắn Tỉa
edit("packages/shared/src/rules.ts", '''  const bonus = role === "assassin" && isCarry(target) ? 1.2 : 1;
  const fx: Effect[] = [{ type: "damage", target: t, amount: physical(atk * bonus, target, a), label: bonus > 1 ? "lướt +20%" : "đánh thường" }];''',
'''  const bonus = role === "assassin" && isCarry(target) ? 1.2 : 1;
  // Bắn Tỉa: mục tiêu lượt trước không di chuyển (cờ moved của nó chỉ xoá khi tới lượt nó)
  const snipe = role === "marksman" && !target.moved ? 1.1 : 1;
  const fx: Effect[] = [{ type: "damage", target: t, amount: physical(atk * bonus * snipe, target, a),
    label: bonus > 1 ? "lướt +20%" : snipe > 1 ? "Bắn Tỉa" : "đánh thường" }];''')
edit("packages/shared/src/i18n/index.ts", '"lướt +20%": "label.dash",', '"lướt +20%": "label.dash", "Bắn Tỉa": "label.snipe",')
edit("packages/shared/src/i18n/ui.ts", '  "label.dash": "lướt +20%",', '  "label.dash": "lướt +20%",\n  "label.snipe": "Bắn Tỉa",')
edit("packages/shared/src/i18n/ui.ts", '  "label.dash": "dash +20%",', '  "label.dash": "dash +20%",\n  "label.snipe": "Sniper",')

# 5) Hỗ Trợ: server nhân khiên/hồi từ trợ thủ lên đồng minh đứng kề
edit("packages/server/src/DuelRoom.ts", '''        case "shield": if (live) {
          live.shield += fx.amount;''', '''        case "shield": if (live) {
          const amt = Math.round(fx.amount * this.helpingHand(source, live));
          live.shield += amt;''')
s = open(os.path.join(ROOT, "packages/server/src/DuelRoom.ts"), encoding="utf-8").read()
i = s.index('case "shield": if (live) {'); j = s.index('case "heal": {', i)
blk = s[i:j].replace("this.stat(source).support += fx.amount;", "this.stat(source).support += amt;").replace('this.log("log.shield", { hero: live.defId, n: fx.amount });', 'this.log("log.shield", { hero: live.defId, n: amt });')
s = s[:i] + blk + s[j:]
open(os.path.join(ROOT, "packages/server/src/DuelRoom.ts"), "w", encoding="utf-8").write(s)
edit("packages/server/src/DuelRoom.ts", '''          const amount = Math.round(fx.amount * (hasStatus(live, "wounds") ? 0.5 : 1));''',
     '''          const amount = Math.round(fx.amount * (hasStatus(live, "wounds") ? 0.5 : 1) * this.helpingHand(source, live));''')
edit("packages/server/src/DuelRoom.ts", '''  /** Vùng của phe `side`: chạy zoneTick''', '''  /** Hỗ Trợ (luật vai trợ thủ): khiên/hồi từ trợ thủ lên đồng minh đứng kề mạnh hơn 15% */
  private helpingHand(source: UnitState | undefined, to: UnitState) {
    return source && source.id !== to.id && source.owner === to.owner && roleOf(source) === "support" && adjacent(source, to) ? 1.15 : 1;
  }

  /** Vùng của phe `side`: chạy zoneTick''')
print("ok")
