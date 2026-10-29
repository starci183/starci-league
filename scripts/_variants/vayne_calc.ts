// So Vayne hiện tại và đề xuất: % máu địch cùng số đồ mất mỗi lượt, có tính Mũi Tên Bạc (kỳ vọng 1/3 mỗi đòn).
import { CARDS, HeroCard, UnitLike, apOf, atkOf, baseStats, computeAttack, computeSkill, getItem, itemDamageTaken, runHook, statsOf } from "@starci/shared";
import "./vayne_v2";

const DUMMIES: Record<string, { hp: number; armor: number; mr: number; role: string; items: string[] }> = {
  tank: { hp: 960, armor: 40, mr: 35, role: "tank", items: ["ao_choang_gai", "giap_gargoyle", "giap_warmog"] },
  mage: { hp: 720, armor: 25, mr: 25, role: "mage", items: ["mu_rabadon", "quy_thu", "mat_na_liandry"] },
  assassin: { hp: 760, armor: 25, mr: 25, role: "assassin", items: ["ao_choang_bong_toi", "huyet_kiem", "kiem_tu_than"] },
};
for (const [k, d] of Object.entries(DUMMIES))
  (CARDS as Record<string, unknown>)[`dummy_${k}`] = { ...CARDS.lux, id: `dummy_${k}`, hp: d.hp, armor: d.armor, mr: d.mr, role: d.role, skills: [] };
let seq = 0;
function unit(owner: string, id: string, row: string, items: string[] = [], stacks: Record<string, number> = {}, statuses: Record<string, number> = {}): UnitLike {
  const h = CARDS[id] as HeroCard;
  const maxHp = h.hp + items.reduce((s, it) => s + (baseStats(getItem(it)!).hp ?? 0), 0);
  return { id: `u${++seq}`, owner, defId: id, lane: 2, row, hp: maxHp, maxHp, shield: 0, atkBonus: 0, mana: 999, status: "board",
    readyTurn: 0, attacked: false, castThisTurn: false, empowered: false, hidden: false, summonedTurn: 0, markedTargetId: "",
    cooldowns: new Map(), statuses: new Map(Object.entries(statuses)), stacks: new Map(Object.entries(stacks)), items } as unknown as UnitLike;
}
const dmgOn = (fx: any[], t: UnitLike) => fx.reduce((s, f) => (f.type === "damage" && f.target.kind === "unit" && f.target.id === t.id ? s + f.amount : s), 0);

/** % máu mỗi lượt khi đánh thường (kèm Mũi Tên Bạc), ở trạng thái `mode` */
function turn(defId: string, items: string[], k: string, mode: "thường" | "Q" | "Q+W+R") {
  const st0: Record<string, number> = mode === "Q+W+R" ? { focus: 2, empower: 3 } : {};
  const me = unit("A", defId, "back", items, mode === "thường" ? {} : { "t:vayne_q": 1 }, st0);
  const t = unit("B", `dummy_${k}`, "back", DUMMIES[k].items.slice(0, items.length), { vayne_ring: 2 });
  const state = { turn: 9, activeSide: "A", units: new Map([[me.id, me], [t.id, t]]) };
  const st = statsOf(me), hits = 1 + st.extraAtk, critMult = 1 + st.crit * (0.5 + st.critDmg);
  const fx = computeAttack(state, me, { kind: "unit", id: t.id });
  const proc = dmgOn(runHook(me, "onAttack", { state, target: t, isAttack: true, effects: fx, preview: false } as never), t);
  const per = dmgOn(fx, t) * critMult + proc / 3;
  const taken = itemDamageTaken(t, { isAttack: true, preview: true } as never);
  return { pct: Math.round((per * hits * taken / t.maxHp) * 100), hits, st, me, state, t };
}
function eOn(defId: string, items: string[], k: string) {
  const r = turn(defId, items, k, "thường");
  const e = (CARDS[defId] as HeroCard).skills.find((s) => s.endsWith("_e"))!;
  return Math.round((dmgOn(computeSkill(r.state, r.me, e, r.t.id), r.t) / r.t.maxHp) * 100);
}
const BUILDS: Record<string, string[]> = {
  "Không đồ": [],
  "Đấu tay đôi: Vô Cực + Đại Bác + Huyết Kiếm": ["vo_cuc_kiem", "dai_bac", "huyet_kiem"],
  "Chống lao vào: Huyết Kiếm + Thiên Thần + Khăn Giải Thuật": ["huyet_kiem", "giap_thien_than", "khan_giai_thuat"],
  "Dị AP: Bảo Thạch + Rabadon + Guinsoo": ["gang_bao_thach", "mu_rabadon", "cuong_dao"],
  "Xay tank (đồ của Kog): Guinsoo + Diệt Khổng Lồ + Nashor": ["cuong_dao", "diet_khong_lo", "nanh_nashor"],
};
for (const defId of ["vayne", "vayne2"]) {
  console.log(`\n=== ${defId === "vayne" ? "Vayne HIỆN TẠI (chỉ số cũ)" : "Vayne ĐỀ XUẤT"} ===`);
  const rows: Record<string, unknown>[] = [];
  for (const [name, items] of Object.entries(BUILDS)) {
    const row: Record<string, unknown> = { "Bộ đồ": name };
    const b = turn(defId, items, "tank", "thường");
    row["AD/AP"] = `${atkOf(b.me)}/${apOf(b.me)}`; row["Đòn"] = b.hits.toFixed(2);
    for (const k of Object.keys(DUMMIES)) {
      row[`${k} thường`] = `${turn(defId, items, k, "thường").pct}%`;
      row[`${k} Q+W+R`] = `${turn(defId, items, k, "Q+W+R").pct}%`;
      row[`${k} E`] = `${eOn(defId, items, k)}%`;
    }
    rows.push(row);
  }
  console.table(rows);
}
