// Đo tướng thiết kế lại: % máu bia mất mỗi lượt (bia cùng số đồ), theo kịch bản.
//  - "dồn": đánh thường + mọi chiêu gây sát thương trong 1 lượt (trần ~45%)
//  - "đều": đánh thường + Σ(sát thương chiêu / hồi chiêu)  (nhịp trung bình mỗi lượt)
// Chạy: npx tsx scripts/_variants/redesign/calc.ts <heroId> "<items>" [kịch bản: plain|moved|trapped|loot|link]
import { CARDS, HeroCard, UnitLike, baseStats, computeAttack, computeSkill, getItem, itemDamageTaken, statsOf, SKILLS, getHero } from "@starci/shared";

const [defId = "katarina", build = "", scen = "plain"] = process.argv.slice(2);
const hero = CARDS[defId] as HeroCard;
let seq = 0;
const DUMMIES: Record<string, { hp: number; armor: number; mr: number; role: string; items: string[]; base: string }> = {
  tank: { hp: 960, armor: 40, mr: 35, role: "tank", items: ["ao_choang_gai", "giap_gargoyle", "giap_warmog"], base: "braum" },
  mage: { hp: 720, armor: 25, mr: 25, role: "mage", items: ["mu_rabadon", "quy_thu", "mat_na_liandry"], base: "lux" },
  support: { hp: 800, armor: 30, mr: 30, role: "support", items: ["vuong_mien", "loi_the_ho_ve", "giap_warmog"], base: "janna" },
};
for (const [k, d] of Object.entries(DUMMIES))
  (CARDS as Record<string, unknown>)[`dummy_${k}`] = { ...CARDS[d.base], id: `dummy_${k}`, hp: d.hp, armor: d.armor, mr: d.mr, role: d.role, skills: [] };
function unit(owner: string, id: string, lane: number, row: string, items: string[] = []): UnitLike {
  const h = CARDS[id] as HeroCard;
  const maxHp = h.hp + items.reduce((s, it) => s + (baseStats(getItem(it)!).hp ?? 0), 0);
  return { id: `u${++seq}`, owner, defId: id, lane, row, hp: maxHp, maxHp, shield: 0, atkBonus: 0, mana: 999, status: "board",
    readyTurn: 0, attacked: false, castThisTurn: false, empowered: false, hidden: false, summonedTurn: 0, markedTargetId: "", moved: false,
    cooldowns: new Map(), statuses: new Map(), stacks: new Map(), items } as unknown as UnitLike;
}
const ITEM_STACKS: Record<string, Record<string, number>> = { cuong_dao: { cuong_dao: 5 }, nanh_nashor: { "t:nashor": 1 }, truong_truong_sinh: { "bonus:spellAmp": 20 } };
const dmgOn = (fx: ReturnType<typeof computeAttack>, ids: string[]) =>
  fx.reduce((s, f) => (f.type === "damage" && f.target.kind === "unit" && ids.includes(f.target.id) ? s + f.amount : s), 0);
const ROWN = ["front", "mid", "back"];

const rows: Record<string, string | number>[] = [];
for (const b of ["", build]) {
  const items = b ? b.split(",") : [];
  const me = unit("A", defId, 2, "back", items);
  for (const i of items) for (const [k, v] of Object.entries(ITEM_STACKS[i] ?? {})) (me.stacks as Map<string, number>).set(k, v);
  const st = statsOf(me);
  const critMult = 1 + st.crit * (0.5 + st.critDmg), hits = 1 + st.extraAtk;
  const out: Record<string, string | number> = { build: items.length ? items.join("+") : "(không đồ)" };
  for (const k of Object.keys(DUMMIES)) {
    const t = unit("B", `dummy_${k}`, 2, "front", DUMMIES[k].items.slice(0, items.length));
    const mate = unit("B", `dummy_${k}`, 3, "front", DUMMIES[k].items.slice(0, items.length));
    const zones: unknown[] = [];
    const state = { turn: 9, activeSide: "A", units: new Map([[me.id, me], [t.id, t], [mate.id, mate]]), zones };
    if (scen === "moved") (t as { moved: boolean }).moved = true;
    if (scen === "trapped") zones.push({ id: "z", key: "wall_w", owner: "A", defId: "lissandra", srcId: me.id, side: "B", lane: 2, row: 0, shape: "cross", turns: 2 });
    if (scen === "loot") { (t.statuses as Map<string, number>).set("empower", 2); (t.stacks as Map<string, number>).set("buff:wrath", 2); }
    if (scen === "link") { (t.stacks as Map<string, number>).set("aatrox_link", 9); (mate.stacks as Map<string, number>).set("aatrox_link", 9); }
    const taken = itemDamageTaken(t, { state: undefined as never, isAttack: true, preview: true } as never);
    const pct = (n: number) => Math.round((n * taken / t.maxHp) * 100);
    const ids = [t.id];
    // chuyển 40% của Xích Linh Hồn (hook chỉ chạy live) tính tay: cộng phần đối tác truyền sang mục tiêu
    const relay = scen === "link" && defId === "aatrox" ? 1.4 : 1;
    const atk = dmgOn(computeAttack(state as never, me, { kind: "unit", id: t.id }), ids) * critMult * hits;
    let burst = atk, avg = atk;
    const parts: string[] = [`A${pct(atk)}`];
    for (const s of hero.skills) {
      const def = SKILLS[s];
      const fx = def.target === "cell" ? computeSkill(state as never, me, s, undefined, false, { lane: t.lane, row: ROWN[0] as never })
        : computeSkill(state as never, me, s, def.target === "enemyAny" ? t.id : undefined);
      let d = dmgOn(fx, ids) + (relay > 1 ? 0.4 * dmgOn(fx, [mate.id]) : 0); // phần truyền từ đối tác bị xích
      // vùng tồn tại: cộng các lần zoneTick (1 lần/lượt sau)
      const z = fx.find((f) => f.type === "zone") as { key: string; turns: number; shape: string; lane: number; row: number; side: string } | undefined;
      const hz = getHero(defId);
      if (z && hz?.zoneTick) d += dmgOn(hz.zoneTick({ state: state as never, unit: me, zone: { ...z, id: "z", owner: "A", defId, srcId: me.id } as never, targets: [t] }), ids) * z.turns;
      burst += d; avg += d / Math.max(1, def.cooldown);
      parts.push(`${def.key}${pct(d)}`);
    }
    out[`${k} dồn`] = `${pct(burst)}%`; out[`${k} đều`] = `${pct(avg)}%`; out[`${k} chi tiết`] = parts.join(" ");
  }
  rows.push(out);
}
console.log(`${defId} · kịch bản ${scen}`);
console.table(rows);
