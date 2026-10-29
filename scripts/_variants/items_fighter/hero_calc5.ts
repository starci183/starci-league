// % máu địch (cùng số đồ, đồ đúng vai trò của nó) mất theo từng hành động cho 5 tướng Aatrox/Darius/Zed/Katarina/Kha'Zix.
// Tính bằng engine thật (computeAttack/computeSkill + hook onAttack/onSkill), kỳ vọng chí mạng và tốc đánh.
// Chạy: npx tsx scripts/_variants/items_fighter/hero_calc5.ts <heroId> ["đồ,đồ,đồ" ...]
import {
  CARDS, HeroCard, UnitLike, Effect, apOf, atkOf, baseStats, computeAttack, computeSkill, damageTakenMult, getItem, itemDamageTaken,
  runHook, statsOf,
} from "@starci/shared";

const [defId = "aatrox", ...builds] = process.argv.slice(2);
const hero = CARDS[defId] as HeroCard;
const DUMMIES: Record<string, { hp: number; armor: number; mr: number; role: string; row: string; items: string[] }> = {
  mage: { hp: 720, armor: 25, mr: 25, role: "mage", row: "back", items: ["mu_rabadon", "quy_thu", "mat_na_liandry"] },
  assassin: { hp: 760, armor: 25, mr: 25, role: "assassin", row: "mid", items: ["ao_choang_bong_toi", "huyet_kiem", "kiem_tu_than"] },
  fighter: { hp: 880, armor: 35, mr: 30, role: "fighter", row: "front", items: ["sterak", "tim_bang", "y_chi_titan"] },
  tank: { hp: 960, armor: 40, mr: 35, role: "tank", row: "front", items: ["ao_choang_gai", "giap_gargoyle", "giap_warmog"] },
};
for (const [k, d] of Object.entries(DUMMIES))
  (CARDS as Record<string, unknown>)[`d5_${k}`] = { ...CARDS.lux, id: `d5_${k}`, hp: d.hp, armor: d.armor, mr: d.mr, role: d.role, skills: [] };

let seq = 0;
function unit(owner: string, id: string, lane: number, row: string, items: string[] = [], hpPct = 1): UnitLike {
  const h = CARDS[id] as HeroCard;
  const maxHp = h.hp + items.reduce((s, it) => s + (baseStats(getItem(it)!).hp ?? 0), 0);
  return {
    id: `u${++seq}`, owner, defId: id, lane, row, hp: Math.round(maxHp * hpPct), maxHp, shield: 0, atkBonus: 0, mana: 999, status: "board",
    readyTurn: 0, attacked: false, castThisTurn: true, empowered: false, hidden: false, summonedTurn: 0, markedTargetId: "",
    cooldowns: new Map(), statuses: new Map(), stacks: new Map(), items,
  } as unknown as UnitLike;
}
const set = (u: UnitLike, k: string, v: number) => (u.stacks as unknown as Map<string, number>).set(k, v);
const st = (u: UnitLike, k: string, v: number) => (u.statuses as unknown as Map<string, number>).set(k, v);

/** Kịch bản từng tướng: chuẩn bị trạng thái trước khi tính (cộng dồn giữa trận, cờ combo) */
type Prep = (me: UnitLike, t: UnitLike, burst: boolean) => void;
const PREP: Record<string, { grouped?: boolean; prep: Prep; rowOf?: (role: string) => string }> = {
  aatrox: { prep: (me, t, b) => { set(me, "aatrox_war", b ? 4 : 2); if (b) { set(me, "t:aatrox_e", 1); st(me, "empower", 3); set(t, "t:aatrox_chain", 1); } } },
  darius: { prep: (me, t, b) => { set(t, "darius_bleed", b ? 5 : 3); if (b) { set(me, "t:darius_w", 1); st(me, "empower", 2); } } },
  zed: { prep: (me, t, b) => { set(me, "t:zed_shadow", t.lane + 1); if (b) set(t, "zed_mark", 1); } },
  katarina: { grouped: true, prep: (me, t, b) => { set(t, "kat_dagger", 1); if (b) set(me, "t:kat_w", 1); } },
  khazix: { prep: (me, t, b) => { set(me, "kz_evo", 1); if (b) { set(me, "kz_unseen", 1); st(me, "empower", 2); } } },
};

const dmgOn = (fx: Effect[], t: UnitLike) => fx.reduce((s, f) => {
  if (f.type === "damage" && f.target.kind === "unit" && f.target.id === t.id) return s + f.amount;
  if (f.type === "burn" && f.unitId === t.id) return s + f.amount; // đốt: không cộng dồn, tính 1 lượt mỗi lần làm mới
  return s;
}, 0);

function row(build: string, k: string, burst: boolean, hpPct = 1) {
  const items = build ? build.split(",") : [];
  const d = DUMMIES[k];
  const me = unit("A", defId, 2, hero.role === "fighter" ? "front" : "mid", items);
  const t = unit("B", `d5_${k}`, 2, d.row, d.items.slice(0, items.length), hpPct);
  const units = [me, t];
  if (PREP[defId]?.grouped) units.push(unit("B", "d5_fighter", 1, d.row, [])); // địch đứng kề mục tiêu
  const state = { turn: 9, activeSide: "A", units: new Map(units.map((u) => [u.id, u])) } as never;
  PREP[defId]?.prep(me, t, burst);
  const s = statsOf(me, state);
  const taken = itemDamageTaken(t, { state, isAttack: true, preview: true } as never) * damageTakenMult(t);
  const pct = (n: number) => (n * taken / t.maxHp) * 100;
  const critMult = 1 + s.crit * (0.5 + s.critDmg);
  const atkFx = computeAttack(state, me, { kind: "unit", id: t.id });
  const hook = runHook(me, "onAttack", { state, target: t, isAttack: true, effects: atkFx, preview: false });
  const atk = (dmgOn(atkFx, t) * critMult + dmgOn(hook, t)) * (1 + s.extraAtk);
  const out: Record<string, number> = { Đánh: pct(atk) };
  let all = atk;
  for (const sid of hero.skills) {
    const fx = computeSkill(state, me, sid, t.id);
    const sh = runHook(me, "onSkill", { state, target: t, isSkill: true, effects: fx, preview: false });
    const v = dmgOn(fx, t) + dmgOn(sh, t);
    out[sid.split("_").pop()!.toUpperCase()] = pct(v);
    all += v;
  }
  // Zed: Dấu Ấn nổ lượt sau theo sát thương đã dồn
  if (defId === "zed" && burst) all += all * 0.2 + 0.2 * apOf(me);
  out.Lượt = out.Đánh + (out.Q ?? 0);
  out.Dồn = pct(all);
  return { out, me };
}

const fmt = (n: number) => `${Math.round(n)}%`;
for (const build of ["", ...builds]) {
  const { me } = row(build, "mage", false);
  console.log(`\n${defId} · ${build || "(không đồ)"} · AD ${atkOf(me)} / AP ${apOf(me)} / máu ${me.maxHp}`);
  const rows: Record<string, string>[] = [];
  for (const k of Object.keys(DUMMIES)) for (const burst of [false, true]) {
    const { out } = row(build, k, burst);
    rows.push({ "mục tiêu": `${k}${burst ? " (dồn)" : ""}`, ...Object.fromEntries(Object.entries(out).map(([a, b]) => [a, fmt(b)])) });
  }
  console.table(rows);
}
