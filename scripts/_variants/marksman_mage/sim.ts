// Mô phỏng nhiều lượt cho 8 tướng xạ thủ/pháp sư (agent marksman_mage). Không nạp vào game.
// Mỗi lượt của mình: +10 mana, hồi chiêu −1, tung chiêu theo thứ tự ưu tiên (đủ mana + hết hồi), rồi đánh thường mục tiêu chính.
// Hiệu ứng được áp như server (Buốt +25%, khiên, giảm sát thương từ đồ, đẩy lùi, trạng thái giảm khi chủ tướng hết lượt).
// Bia: địch cùng số đồ với mình (đồ đúng vai trò). Đồng minh bia (trợ thủ 800 máu) dùng cho khiên/đứng kề.
// Chạy: npx tsx scripts/_variants/marksman_mage/sim.ts [heroId ...]
import {
  CARDS, HeroCard, UnitLike, Effect, apOf, atkOf, baseStats, computeAttack, computeSkill, damageTakenMult, getItem,
  itemDamageTaken, runHook, statsOf, skillCost, skillTargets, SKILLS, rowIndex, ROWS, skillCells, outgoing, getHero, unitsInArea, AreaShape, Row,
} from "@starci/shared";

const DEBUG = !!process.env.DEBUG;
type Kind = "tank" | "mage" | "fighter" | "assassin" | "ally";
const DUMMIES: Record<Kind, { hp: number; armor: number; mr: number; role: string; items: string[] }> = {
  tank: { hp: 960, armor: 40, mr: 35, role: "tank", items: ["ao_choang_gai", "giap_gargoyle", "giap_warmog"] },
  mage: { hp: 720, armor: 25, mr: 25, role: "mage", items: ["mu_rabadon", "quy_thu", "mat_na_liandry"] },
  fighter: { hp: 880, armor: 35, mr: 30, role: "fighter", items: ["sterak", "y_chi_titan", "huyet_kiem"] },
  assassin: { hp: 760, armor: 25, mr: 25, role: "assassin", items: ["ao_choang_bong_toi", "huyet_kiem", "kiem_tu_than"] },
  ally: { hp: 800, armor: 30, mr: 30, role: "support", items: [] },
};
for (const [k, d] of Object.entries(DUMMIES))
  (CARDS as Record<string, unknown>)[`dummy_${k}`] = { ...CARDS.braum, id: `dummy_${k}`, name: k, hp: d.hp, armor: d.armor, mr: d.mr, role: d.role, atk: 60, ap: 40, skills: [] };

let seq = 0;
function mk(owner: string, defId: string, lane: number, row: string, items: string[] = []): UnitLike {
  const h = CARDS[defId] as HeroCard;
  const maxHp = h.hp + items.reduce((s, it) => s + (baseStats(getItem(it)!).hp ?? 0), 0);
  return { id: `u${++seq}`, owner, defId, lane, row, hp: maxHp, maxHp, shield: 0, atkBonus: 0, mana: 30, status: "board",
    readyTurn: 0, attacked: false, castThisTurn: false, empowered: false, hidden: false, summonedTurn: -1, markedTargetId: "", moved: false,
    cooldowns: new Map(), statuses: new Map(), stacks: new Map(), items } as unknown as UnitLike;
}
const M = (u: UnitLike) => u as unknown as { statuses: Map<string, number>; stacks: Map<string, number>; cooldowns: Map<string, number> };

export interface Scenario {
  name: string;
  me: { lane: number; row: string };
  /** địch: [0] là mục tiêu chính */
  foes: { kind: Kind; lane: number; row: string; hidden?: boolean }[];
  allies?: { lane: number; row: string }[];
}
export const SCEN: Record<string, Scenario> = {
  tank: { name: "1v1 tank", me: { lane: 2, row: "back" }, foes: [{ kind: "tank", lane: 2, row: "front" }] },
  mage: { name: "1v1 pháp sư", me: { lane: 2, row: "back" }, foes: [{ kind: "mage", lane: 2, row: "mid" }] },
  fighter: { name: "1v1 đấu sĩ", me: { lane: 2, row: "back" }, foes: [{ kind: "fighter", lane: 2, row: "front" }] },
  // giao tranh dồn: tank + đấu sĩ + pháp sư đứng sát nhau ở đường 2-3
  pack: { name: "địch dồn", me: { lane: 2, row: "back" }, allies: [{ lane: 1, row: "mid" }],
    foes: [{ kind: "tank", lane: 2, row: "front" }, { kind: "fighter", lane: 1, row: "front" }, { kind: "mage", lane: 2, row: "mid" }] },
  // địch tản: mỗi đường 1 tướng, không ai đứng kề ai
  spread: { name: "địch tản", me: { lane: 2, row: "back" },
    foes: [{ kind: "mage", lane: 2, row: "mid" }, { kind: "tank", lane: 0, row: "front" }, { kind: "fighter", lane: 4, row: "front" }] },
  // sát thủ đang ẩn (vd. Vũ Điệu/Áo Choàng Bóng Tối) lao vào tiền tuyến cùng đường
  assassin: { name: "sát thủ ẩn", me: { lane: 2, row: "back" }, foes: [{ kind: "assassin", lane: 2, row: "front", hidden: true }] },
  wall: { name: "đường biên", me: { lane: 0, row: "back" }, foes: [{ kind: "mage", lane: 0, row: "back" }, { kind: "tank", lane: 1, row: "front" }] },
};

export interface Result { burst: number; avg: number; perTurn: number[]; ttk: number; shield: number; heal: number; aoe: number; ad: number; ap: number }

export function simulate(defId: string, build: string[], order: string[], sc: Scenario, turns = 6, burstMode = false): Result {
  const me = mk("A", defId, sc.me.lane, sc.me.row, build);
  const foes = sc.foes.map((f) => Object.assign(mk("B", `dummy_${f.kind}`, f.lane, f.row, DUMMIES[f.kind].items.slice(0, build.length)), { hidden: !!f.hidden }));
  const allies = (sc.allies ?? []).map((a) => mk("A", "dummy_ally", a.lane, a.row));
  const all = [me, ...foes, ...allies];
  const state = { turn: 0, activeSide: "A", units: new Map(all.map((u) => [u.id, u])) } as never as { turn: number; activeSide: string; units: Map<string, UnitLike> };
  const dealt = new Map<string, number>();
  const byLabel = new Map<string, number>();
  const zones: Extract<Effect, { type: "zone" }>[] = [];
  let shield = 0, heal = 0;
  const st = statsOf(me);
  const critMult = st.crit >= 1 ? 1 : 1 + st.crit * (0.5 + st.critDmg);

  const apply = (fx: Effect[], scale = 1) => {
    for (const f of fx) {
      if (f.type === "damage") {
        if (f.target.kind !== "unit") continue;
        const t = state.units.get(f.target.id);
        if (!t || t.owner === me.owner) continue;
        let n = f.amount * scale * damageTakenMult(t) * itemDamageTaken(t, { state, source: me, isAttack: f.tag === "attack", isSkill: f.tag === "skill", preview: true } as never);
        const abs = Math.min(t.shield, n); t.shield -= abs; n -= abs;
        t.hp -= n;
        dealt.set(t.id, (dealt.get(t.id) ?? 0) + n);
        if (DEBUG && t === foes[0]) byLabel.set(f.label, (byLabel.get(f.label) ?? 0) + n);
        continue;
      }
      if (scale < 0.5) continue; // đòn lẻ xác suất thấp: bỏ hiệu ứng phụ
      const u = "unitId" in f ? state.units.get((f as { unitId: string }).unitId) : undefined;
      switch (f.type) {
        case "status": if (u) M(u).statuses.set(f.status, Math.max(f.turns, M(u).statuses.get(f.status) ?? 0)); break;
        case "stack": if (u) { const cur = M(u).stacks.get(f.key) ?? 0; let nx = f.set ?? cur + (f.add ?? 0); if (f.max !== undefined) nx = Math.min(f.max, nx); if (nx === 0) M(u).stacks.delete(f.key); else M(u).stacks.set(f.key, nx); } break;
        case "shield": if (u) { u.shield += f.amount; if (u.owner === me.owner) shield += f.amount; } break;
        case "heal": if (u && u.owner === me.owner) { const b = u.hp; u.hp = Math.min(u.maxHp, u.hp + f.amount); heal += f.amount; void b; } break;
        case "heroMana": if (u) u.mana = Math.min(100, u.mana + f.amount); break;
        case "cooldown": if (u) M(u).cooldowns.forEach((v, k) => M(u).cooldowns.set(k, f.reset ? 0 : Math.max(0, v + (f.delta ?? 0)))); break;
        case "displace": if (u) {
          const ri = rowIndex(u.row) + (f.dRow ?? 0), lane = u.lane + (f.dLane ?? 0);
          if (ri < 0 || ri > 2 || lane < 0 || lane > 4) break;
          if ([...state.units.values()].some((x) => x.owner === u.owner && x.lane === lane && x.row === ROWS[ri])) break;
          (u as { row: string }).row = ROWS[ri]; (u as { lane: number }).lane = lane; break;
        }
        case "pull": if (u && rowIndex(u.row) > 0) { const to = ROWS[rowIndex(u.row) - 1]; const ah = [...state.units.values()].find((x) => x.owner === u.owner && x.lane === u.lane && x.row === to); if (ah) (ah as { row: string }).row = u.row; (u as { row: string }).row = to; } break;
        case "burn": if (u) { M(u).statuses.set("burn", Math.max(f.turns, M(u).statuses.get("burn") ?? 0)); M(u).stacks.set("burn", Math.max(f.amount, M(u).stacks.get("burn") ?? 0)); } break;
        case "hide": if (u) (u as { hidden: boolean }).hidden = true; break;
        case "zone": zones.push({ ...f }); break;
        case "freeMove": if (u) (u as { moved: boolean }).moved = false; break;
        default: break;
      }
    }
  };
  const endTurn = (side: string) => {
    for (const u of all) {
      if (u.owner !== side) continue;
      if ((M(u).statuses.get("burn") ?? 0) > 0) apply([{ type: "damage", target: { kind: "unit", id: u.id }, amount: M(u).stacks.get("burn") ?? 0, label: "Đốt", tag: "item" }]);
      M(u).statuses.forEach((v, k) => (v <= 1 ? M(u).statuses.delete(k) : M(u).statuses.set(k, v - 1)));
      M(u).stacks.forEach((_, k) => { if (k.startsWith("t:")) M(u).stacks.delete(k); });
    }
  };
  const primary = foes[0];
  const perTurn: number[] = [];
  let ttk = 0;
  for (let turn = 1; turn <= turns; turn++) {
    state.turn = turn * 2 + 7; state.activeSide = "A";
    const before = dealt.get(primary.id) ?? 0, beforeAll = [...dealt.values()].reduce((a, b) => a + b, 0);
    (me as { mana: number }).mana = burstMode ? 100 : Math.min(100, me.mana + 10);
    if (burstMode) M(me).cooldowns.clear();
    M(me).cooldowns.forEach((v, k) => M(me).cooldowns.set(k, Math.max(0, v - 1)));
    Object.assign(me, { castThisTurn: false, attacked: false, moved: false, hidden: false });
    apply(runHook(me, "onTurnStart", { state, preview: false } as never));
    for (const z of [...zones]) {
      const tick = getHero(defId)?.zoneTick;
      if (tick) {
        const targets = unitsInArea(state as never, z.side, z.shape as AreaShape, { lane: z.lane, row: z.row });
        const zl = { id: "z", key: z.key, owner: me.owner, defId, srcId: me.id, side: z.side, lane: z.lane, row: z.row, shape: z.shape, turns: z.turns };
        apply(outgoing(state as never, me, tick({ state: state as never, unit: me, zone: zl, targets }), { isSkill: true, live: false }));
      }
      if (--z.turns <= 0) zones.splice(zones.indexOf(z), 1);
    }
    for (const key of order) {
      const sid = (CARDS[defId] as HeroCard).skills.find((s) => s.endsWith(`_${key.toLowerCase()}`));
      if (!sid) continue;
      const def = SKILLS[sid];
      if ((M(me).cooldowns.get(sid) ?? 0) > 0 || me.mana < skillCost(me, sid)) continue;
      let targetId: string | undefined;
      let cell: { lane: number; row: Row } | undefined;
      if (def.target === "cell") {
        const cs = skillCells(state as never, me, sid);
        cell = cs.find((c) => c.lane === primary.lane && c.row === primary.row);
        if (!cell) continue;
      } else if (def.target !== "none") {
        const ids = skillTargets(state as never, me, sid);
        if (!ids.length) continue;
        targetId = ids.includes(primary.id) ? primary.id : def.target === "allyLane" ? (ids.find((i) => i !== me.id) ?? ids[0]) : ids[0];
      }
      (me as { mana: number }).mana -= skillCost(me, sid);
      M(me).cooldowns.set(sid, def.cooldown);
      (me as { castThisTurn: boolean }).castThisTurn = true;
      apply(computeSkill(state as never, me, sid, targetId, false, cell));
      apply(runHook(me, "onCast", { state, skillId: sid, preview: false } as never));
    }
    // đánh thường mục tiêu chính
    const hitsF = 1 + statsOf(me, state as never).extraAtk;
    const whole = Math.floor(hitsF), frac = hitsF - whole;
    (me as { mana: number }).mana = Math.min(100, me.mana + 10);
    for (let i = 0; i < whole + (frac > 0.01 ? 1 : 0); i++) {
      const w = i < whole ? 1 : frac;
      const tg = { kind: "unit" as const, id: primary.id };
      const fx = computeAttack(state as never, me, tg, false);
      const hook = runHook(me, "onAttack", { state, target: primary, isAttack: true, effects: fx, preview: false } as never);
      apply(fx.map((f) => (f.type === "damage" && !f.crit ? { ...f, amount: f.amount * critMult } : f)), w);
      apply(hook, w);
    }
    endTurn("A");
    endTurn("B");
    const d = (dealt.get(primary.id) ?? 0) - before;
    perTurn.push(Math.round((d / primary.maxHp) * 100));
    if (!ttk && (dealt.get(primary.id) ?? 0) >= primary.maxHp) ttk = turn;
    void beforeAll;
  }
  if (DEBUG) console.log(defId, build.join("+"), sc.name, burstMode ? "DỒN" : "6 lượt", [...byLabel].map(([k, v]) => `${k}:${Math.round((v / primary.maxHp) * 100)}%`).join(" · "));
  const aoe = foes.reduce((s, f) => s + (dealt.get(f.id) ?? 0) / f.maxHp, 0) / foes.length;
  return { burst: perTurn[0], avg: Math.round(perTurn.reduce((a, b) => a + b, 0) / perTurn.length), perTurn, ttk, shield: Math.round(shield / turns), heal: Math.round(heal / turns), aoe: Math.round((aoe / turns) * 100), ad: atkOf(me), ap: apOf(me) };
}

/** Một dòng bảng: dồn (mana 100, hết hồi) + trung bình 6 lượt có mana thật */
export function line(defId: string, label: string, build: string[], order: string[], sc: Scenario) {
  const b = simulate(defId, build, order, sc, 1, true);
  const r = simulate(defId, build, order, sc);
  return { "Bộ đồ": label, Bia: sc.name, "AD/AP": `${r.ad}/${r.ap}`, "Dồn 1 lượt": `${b.burst}%`, "TB/lượt": `${r.avg}%`, "6 lượt": r.perTurn.map((x) => `${x}`).join(" "),
    "Lượt hạ": r.ttk || ">6", "TB cả đội địch": `${r.aoe}%`, "Khiên/lượt": r.shield, "Hồi/lượt": r.heal };
}
