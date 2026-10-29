// Đo giá trị từng món đồ huyền thoại theo 6 lối build, bằng engine thật nhưng trên tướng MẪU (không đọc tướng thật,
// để số không đổi khi agent khác chỉnh tướng). Chạy: npx tsx scripts/_variants/items_fighter/item_calc.ts [--all] [--combo a,b,c]
import {
  CARDS, UnitLike, allItems, armorOf, baseStats, bonusHpOf, computeAttack, computeSkill, damageTakenMult, getItem,
  itemDamageTaken, mrOf, runHook, statsOf, defineHero, mixed, atkOf, apOf,
} from "@starci/shared";
import type { Effect } from "@starci/shared";

// ---------- tướng mẫu theo khung chỉ số mới ----------
type Arch = "marksman" | "mage" | "fighter" | "assassin" | "tank" | "support";
const STATS: Record<Arch, { atk: number; ap: number; hp: number; armor: number; mr: number }> = {
  marksman: { atk: 70, ap: 35, hp: 720, armor: 25, mr: 25 },
  mage: { atk: 40, ap: 85, hp: 720, armor: 25, mr: 25 },
  assassin: { atk: 110, ap: 40, hp: 760, armor: 25, mr: 25 },
  fighter: { atk: 90, ap: 40, hp: 880, armor: 35, mr: 30 },
  tank: { atk: 55, ap: 45, hp: 960, armor: 40, mr: 35 },
  support: { atk: 45, ap: 70, hp: 800, armor: 30, mr: 30 },
};
/** Chiêu mẫu: hệ số chính cao, phụ thấp (đúng triết lý lai) */
const SKILL: Record<Arch, (u: UnitLike) => { physical?: number; magic?: number }> = {
  marksman: (u) => ({ physical: 40 + 0.8 * atkOf(u), magic: 0.4 * apOf(u) }),
  mage: (u) => ({ physical: 0.2 * atkOf(u), magic: 70 + 0.8 * apOf(u) }),
  assassin: (u) => ({ physical: 60 + 1.0 * atkOf(u), magic: 0.4 * apOf(u) }),
  fighter: (u) => ({ physical: 40 + 0.9 * atkOf(u) + 0.08 * bonusHpOf(u), magic: 0.35 * apOf(u) }),
  tank: (u) => ({ physical: 30 + 0.5 * atkOf(u) + 0.04 * u.maxHp, magic: 0.4 * apOf(u) }),
  support: (u) => ({ physical: 0.2 * atkOf(u), magic: 40 + 0.5 * apOf(u) }),
};
const ARCHS = Object.keys(STATS) as Arch[];
for (const a of ARCHS) {
  defineHero({
    id: `ib_${a}`, name: a, role: a, ...STATS[a], desc: "", strength: "",
    skills: [{
      def: { id: `ib_${a}_q`, key: "Q", name: "Mẫu", mana: 30, cooldown: 1, target: "enemyAny", desc: "" },
      resolve: ({ state, unit, targetId }) => {
        const t = targetId ? state.units.get(targetId) : undefined;
        // tank/support: chiêu có khống chế (Buốt) để đo đồ thưởng khống chế
        return t ? [...mixed(unit, t, "Mẫu", SKILL[a](unit)), ...(a === "tank" || a === "support" ? [{ type: "status" as const, unitId: t.id, status: "chill" as const, turns: 1 }] : [])] : [];
      },
    }],
  });
}
// bia: không đồ (đo giá trị món đồ, không đo đồ đấu đồ)
defineHero({ id: "ib_dtank", name: "bia tank", role: "tank", atk: 55, ap: 45, hp: 960, armor: 40, mr: 35, desc: "", strength: "" });
defineHero({ id: "ib_dsquishy", name: "bia mỏng", role: "mage", atk: 40, ap: 85, hp: 720, armor: 25, mr: 25, desc: "", strength: "" });
defineHero({ id: "ib_dfighter", name: "bia đấu sĩ", role: "fighter", atk: 90, ap: 40, hp: 880, armor: 35, mr: 30, desc: "", strength: "" });

let seq = 0;
function unit(owner: string, defId: string, lane: number, row: string, items: string[] = [], hpPct = 1, stacks: Record<string, number> = {}): UnitLike {
  const h = CARDS[defId] as unknown as { hp: number };
  const maxHp = h.hp + items.reduce((s, it) => s + (baseStats(getItem(it)!).hp ?? 0), 0);
  return {
    id: `u${++seq}`, owner, defId, lane, row, hp: Math.round(maxHp * hpPct), maxHp, shield: 0, atkBonus: 0, mana: 999, status: "board",
    readyTurn: 0, attacked: false, castThisTurn: true, empowered: true, hidden: false, summonedTurn: 0, markedTargetId: "", moved: false,
    cooldowns: new Map(), statuses: new Map(), stacks: new Map(Object.entries(stacks)), items,
  } as unknown as UnitLike;
}
/** Cộng dồn giữa trận (lượt 4–5) của đồ tích luỹ */
export const ITEM_STACKS: Record<string, Record<string, number>> = {
  cuong_dao: { cuong_dao: 4 }, y_chi_titan: { titan: 8 }, kiem_tu_than: { "bonus:atk": 6 },
  truong_truong_sinh: { "bonus:spellAmp": 15 }, nanh_nashor: { "t:nashor": 1 }, vuong_mien: {}, tam_hop_kiem: { "t:spellblade": 1 },
  kiem_ke_nut: { "t:hybrid": 1 }, sung_hextech: {}, giao_shojin: { shojin: 2 }, huyet_kiem: {}, vuot_rong: {},
};
const stacksFor = (items: string[]) => Object.assign({}, ...items.map((id) => ITEM_STACKS[id] ?? {}));

const isRanged = (a: Arch) => a === "marksman" || a === "mage";
function board(a: Arch, items: string[], targetId: string, hpPct: number, selfHp = 1) {
  const me = unit("A", `ib_${a}`, 2, isRanged(a) ? "back" : "front", items, selfHp, stacksFor(items));
  const ally = unit("A", "ib_dfighter", 1, me.row, [], 0.6);
  // sát thủ lao vào hậu tuyến: mục tiêu chính đứng sau
  const t = unit("B", targetId, 2, a === "assassin" ? "back" : "front", [], hpPct);
  const t2 = unit("B", "ib_dsquishy", 2, a === "assassin" ? "front" : "back", [], hpPct);
  const t3 = unit("B", "ib_dfighter", 3, "front", [], hpPct);
  const state = { turn: 9, activeSide: "A", units: new Map([me, ally, t, t2, t3].map((u) => [u.id, u])) } as never;
  return { me, ally, t, t2, state };
}
const enemyDmg = (fx: Effect[], st: { units: Map<string, UnitLike> }) => {
  const burns = new Map<string, number>();
  let s = 0;
  for (const f of fx) {
    if (f.type === "burn") burns.set(f.unitId, Math.max(burns.get(f.unitId) ?? 0, f.amount * f.turns * 0.8));
    if (f.type !== "damage" || f.target.kind !== "unit") continue;
    const u = st.units.get(f.target.id);
    if (u && u.owner === "B") s += f.amount * damageTakenMult(u);
  }
  return s + [...burns.values()].reduce((x, y) => x + y, 0);
};
const healOf = (fx: Effect[], id: string) => fx.reduce((s, f) => (f.type === "heal" && f.unitId === id) || (f.type === "shield" && f.unitId === id) ? s + f.amount : s, 0);
const MANA_GAIN = 20, SKILL_COST = 30;

/** Sát thương/lượt (tổng lên địch) + máu tự hồi/lượt + giá trị cho đồng minh/lượt */
function turnValue(a: Arch, items: string[], targetId: string, hpPct: number) {
  const { me, ally, t, state } = board(a, items, targetId, hpPct);
  const st = statsOf(me, state);
  const critOf = (isSkill: boolean, fx: Effect[]) => {
    const canCrit = !isSkill || items.some((i) => getItem(i)!.props.some((p) => p.skillCrit));
    if (!canCrit) return 1;
    const extra = items.flatMap((i) => getItem(i)!.props).filter((p) => p.critChance && p.condition.test({ self: me, target: t, state, isSkill, isAttack: !isSkill, preview: true }))
      .reduce((s, p) => s + p.critChance!, 0);
    return 1 + Math.min(1, st.crit + extra) * (0.5 + st.critDmg);
  };
  const tgt = { kind: "unit" as const, id: t.id };
  const atkFx = computeAttack(state, me, tgt);
  const atkHook = runHook(me, "onAttack", { state, target: t, isAttack: true, effects: atkFx, preview: false });
  const hits = 1 + st.extraAtk;
  const atkD = (enemyDmg(atkFx, state as never) * critOf(false, atkFx) + enemyDmg(atkHook, state as never)) * hits;
  const atkHeal = (enemyDmg(atkFx, state as never) * (st.lifesteal + st.omnivamp) + healOf(atkHook, me.id)) * hits;
  const skFx = computeSkill(state, me, `ib_${a}_q`, t.id);
  const skHook = runHook(me, "onSkill", { state, target: t, isSkill: true, effects: skFx, preview: false });
  const castHook = runHook(me, "onCast", { state, preview: false });
  const casts = Math.min(1.2, (MANA_GAIN + st.manaRegen) / Math.max(10, SKILL_COST - st.manaDiscount));
  const skD = (enemyDmg(skFx, state as never) * critOf(true, skFx) + enemyDmg(skHook, state as never)) * casts;
  const skHeal = (enemyDmg(skFx, state as never) * st.omnivamp + healOf(skHook, me.id) + healOf(castHook, me.id)) * casts;
  const startFx = runHook(me, "onTurnStart", { state, preview: false });
  const allyV = healOf([...atkHook, ...skHook, ...castHook].filter(() => true), ally.id) + healOf(startFx, ally.id) + healOf(runHook(me, "onEquip", { state, preview: false }), ally.id) / 4;
  return { dmg: atkD + skD + enemyDmg(startFx, state as never), heal: atkHeal + skHeal + healOf(startFx, me.id), ally: allyV, maxHp: me.maxHp };
}

/** Máu hiệu dụng (sống qua 4 lượt): máu / tỉ lệ nhận (50% vật lý, 50% phép) + khiên/hồi */
function ehp(a: Arch, items: string[], heal = 0) {
  let sum = 0;
  for (const hp of [1, 0.6, 0.3]) {
    const me = unit("B", `ib_${a}`, 2, "front", items, hp, stacksFor(items));
    const foe = unit("A", "ib_assassin", 2, "front");
    const foe2 = unit("A", "ib_mage", 2, "back");
    const state = { turn: 9, activeSide: "A", units: new Map([me, foe, foe2].map((u) => [u.id, u])) } as never;
    const taken = (isAttack: boolean) => itemDamageTaken(me, { state, source: foe, isAttack, isSkill: !isAttack, preview: false }) * damageTakenMult(me);
    const frac = 0.5 * taken(true) * (100 / (100 + armorOf(me))) + 0.5 * taken(false) * (100 / (100 + mrOf(me)));
    let pool = me.maxHp;
    const fx = [
      ...runHook(me, "onEquip", { state, preview: false }),
      ...runHook(me, "onDamaged", { state, source: foe, isAttack: true, amount: 120, preview: false }),
      ...runHook(me, "preventDeath", { state, preview: false }),
      ...[0, 1, 2].flatMap(() => runHook(me, "onTurnStart", { state, preview: false })),
    ];
    for (const f of fx) {
      if ((f.type === "shield" || f.type === "heal") && f.unitId === me.id) pool += f.amount;
      if (f.type === "maxhp" && f.unitId === me.id) pool += f.amount;
      if (f.type === "status" && f.unitId === me.id && f.status === "invuln") pool += 150;
    }
    // phản đòn ước tính thành "máu" (kẻ địch mất máu = đòn tốn thêm)
    sum += (pool + heal * 3) / frac;
  }
  return sum / 3;
}

const TGT = ["ib_dtank", "ib_dsquishy"];
function offense(a: Arch, items: string[]) {
  let d = 0, h = 0, al = 0;
  for (const tg of TGT) for (const hp of [1, 0.6, 0.25]) { const v = turnValue(a, items, tg, hp); d += v.dmg; h += v.heal; al += v.ally; }
  const n = TGT.length * 3;
  return { dmg: d / n, heal: h / n, ally: al / n };
}

const base: Record<string, { dmg: number; heal: number; ehp: number }> = {};
for (const a of ARCHS) { const o = offense(a, []); base[a] = { dmg: o.dmg, heal: o.heal, ehp: ehp(a, [], o.heal) }; }

/** Điểm theo lối: carry ưu tiên sát thương; đấu sĩ = sát thương × sống; tank = sống; support = sống + đồng minh */
function score(a: Arch, items: string[]) {
  const o = offense(a, items);
  const off = o.dmg / base[a].dmg - 1;
  const def = ehp(a, items, o.heal) / base[a].ehp - 1;
  const team = (o.ally * 4) / 880; // giá trị khiên/hồi cho 1 đồng minh qua 4 lượt, theo máu đấu sĩ
  switch (a) {
    case "marksman": case "mage": case "assassin": return { off, def, team, s: off + 0.25 * def };
    case "fighter": return { off, def, team, s: (1 + off) * (1 + def) - 1 };
    case "tank": return { off, def, team, s: def + 0.3 * off + team };
    case "support": return { off, def, team, s: 0.5 * def + 0.3 * off + team * 1.5 };
  }
}

const pct = (v: number) => `${v >= 0 ? "+" : ""}${Math.round(v * 100)}%`;
const comboArg = process.argv.indexOf("--combo");
if (comboArg > 0) {
  const items = process.argv[comboArg + 1].split(",");
  const rows = ARCHS.map((a) => { const r = score(a, items); return { lối: a, "sát thương": pct(r.off), "sống": pct(r.def), "đồng minh": pct(r.team), điểm: pct(r.s) }; });
  console.log(items.join(" + ")); console.table(rows);
} else {
  const rows = allItems().filter((i) => i.tier === "legendary").map((it) => {
    const row: Record<string, string> = { món: it.id };
    let best = -9, bestA = "";
    for (const a of ARCHS) { const r = score(a, [it.id]); row[a] = pct(r.s); if (r.s > best) { best = r.s; bestA = a; } }
    row["tốt nhất"] = `${bestA} ${pct(best)}`;
    return { row, best };
  });
  rows.sort((x, y) => y.best - x.best);
  console.table(rows.map((r) => r.row));
  // mỗi lối: các món ≥ 80% món tốt nhất của lối đó
  for (const a of ARCHS) {
    const s = allItems().filter((i) => i.tier === "legendary").map((it) => ({ id: it.id, v: score(a, [it.id]).s })).sort((x, y) => y.v - x.v);
    const top = s[0].v;
    console.log(`${a.padEnd(9)} top: ${s.filter((x) => x.v >= top * 0.75).map((x) => `${x.id} ${pct(x.v)}`).join(", ")}`);
  }
}
