// Đo 7 tướng đỡ đòn / trợ thủ theo 3 kiểu build (center / counter / dị) bằng chính engine.
//  1) % máu địch cùng số đồ mất: từng chiêu và cả lượt dồn chiêu (tank bia / pháp sư bia, địch đứng dồn 2 tướng cùng đường).
//  2) Mô phỏng 8 lượt của mình (Mana 30 khởi đầu, +10/lượt, +10 đòn đánh, +10 bị trúng ~2 đòn): tổng khiên / hồi máu cho đội,
//     số lượt Kiên Cường lên đồng minh, số lượt địch bị choáng, Kiệt Sức, Mana địch bị hút.
//  3) Số lượt sống khi mỗi lượt địch dồn 250 sát thương CHUẨN vào chính tướng này (có tự khiên/hồi/Kiên Cường).
// Chạy: npx tsx scripts/_variants/tank_support/calc.ts [heroId...]
import {
  CARDS, HeroCard, SKILLS, UnitLike, apOf, armorOf, atkOf, baseStats, bonusHpOf, computeAttack, computeSkill, getItem, itemDamageTaken,
  mrOf, runHook, skillCost, skillTargets, statsOf, isCarry, damageTakenMult,
} from "@starci/shared";

type Fx = ReturnType<typeof computeSkill>[number];
const DUMMIES: Record<string, { hp: number; armor: number; mr: number; role: string; items: string[] }> = {
  tank: { hp: 960, armor: 40, mr: 35, role: "tank", items: ["ao_choang_gai", "giap_gargoyle", "giap_warmog"] },
  mage: { hp: 720, armor: 25, mr: 25, role: "mage", items: ["mu_rabadon", "quy_thu", "mat_na_liandry"] },
  mm: { hp: 720, armor: 25, mr: 25, role: "marksman", items: ["vo_cuc_kiem", "dai_bac", "huyet_kiem"] },
};
for (const [k, d] of Object.entries(DUMMIES))
  (CARDS as Record<string, unknown>)[`dummy_${k}`] = { ...CARDS.lux, id: `dummy_${k}`, hp: d.hp, armor: d.armor, mr: d.mr, role: d.role, skills: [] };

const BUILDS: Record<string, Record<string, string[]>> = {
  malphite: { center: ["ao_choang_gai", "tim_bang", "giap_gargoyle"], counter: ["ao_choang_gai", "y_chi_titan", "mua_dong_vinh_cuu"],
    "dị AP": ["mu_rabadon", "ban_dong_hanh_luden", "quy_thu"], "dị AD": ["sterak", "tam_hop_kiem", "y_chi_titan"] },
  braum: { center: ["giap_warmog", "loi_the_ho_ve", "truong_truong_ton"], counter: ["khien_kaenic", "loi_the_ho_ve", "giap_warmog"],
    "dị AD": ["dai_bac", "sterak", "tam_hop_kiem"] },
  leona: { center: ["giap_gargoyle", "khien_kaenic", "mua_dong_vinh_cuu"], counter: ["vuot_rong", "khien_hu_vo", "giap_gargoyle"],
    "dị AD": ["sterak", "nguyet_thuc", "tam_hop_kiem"] },
  blitzcrank: { center: ["bua_lam", "truong_truong_ton", "giap_warmog"], counter: ["quy_thu", "mat_na_liandry", "vuong_mien"],
    "dị AD": ["tam_hop_kiem", "dao_dien", "sterak"] },
  thresh: { center: ["vuong_mien", "mua_dong_vinh_cuu", "giap_gargoyle"], counter: ["bua_lam", "quy_thu", "giap_gargoyle"],
    "dị AP": ["mu_rabadon", "ban_dong_hanh_luden", "mat_na_liandry"] },
  janna: { center: ["truong_truong_sinh", "bua_lam", "loi_the_ho_ve"], counter: ["ban_dong_hanh_luden", "giap_thien_than", "khan_giai_thuat"],
    "dị AP": ["mu_rabadon", "ban_dong_hanh_luden", "mat_na_liandry"] },
  soraka: { center: ["mu_rabadon", "truong_truong_sinh", "day_chuyen_chuoc_toi"], counter: ["bua_lam", "quy_thu", "mu_thich_nghi"],
    "dị máu": ["giap_warmog", "truong_truong_ton", "day_chuyen_chuoc_toi"] },
};
for (const b of Object.values(BUILDS)) for (const items of Object.values(b)) for (const i of items) if (!getItem(i)) console.warn("THIẾU ĐỒ", i);

let seq = 0;
function unit(owner: string, id: string, lane: number, row: string, items: string[] = [], hpPct = 1): UnitLike {
  const h = CARDS[id] as HeroCard;
  const maxHp = h.hp + items.reduce((s, it) => s + (baseStats(getItem(it)!).hp ?? 0), 0);
  const u = {
    id: `u${++seq}`, owner, defId: id, lane, row, hp: Math.round(maxHp * hpPct), maxHp, shield: 0, atkBonus: 0, mana: 999, status: "board",
    readyTurn: 0, attacked: false, castThisTurn: false, empowered: false, hidden: false, summonedTurn: 0, markedTargetId: "",
    cooldowns: new Map(), statuses: new Map(), stacks: new Map(), items,
  } as unknown as UnitLike;
  // nội tại khi đeo có tăng máu tối đa (Warmog)
  for (const fx of runHook(u, "onEquip", { preview: false } as never)) if (fx.type === "maxhp") { u.maxHp += fx.amount; u.hp += fx.amount; }
  return u;
}
const mkState = (units: UnitLike[]) => ({ turn: 9, activeSide: "A", units: new Map(units.map((u) => [u.id, u])) });
const dmgOn = (fx: Fx[], t: UnitLike) => fx.reduce((s, f) => (f.type === "damage" && f.target.kind === "unit" && f.target.id === t.id ? s + f.amount : s), 0);
const pct = (n: number) => `${Math.round(n)}%`;

// ================= 1) SÁT THƯƠNG =================
/** Địch: mục tiêu ở tiền tuyến đường 2 + 1 đồng đội đứng ngay sau (đứng dồn). Mình đứng tiền tuyến đường 2. */
function damageRow(defId: string, name: string, items: string[]) {
  const out: Record<string, string | number> = { "Build": name };
  for (const k of ["tank", "mage"]) {
    seq = 0;
    const me = unit("A", defId, 2, "front", items);
    const t = unit("B", `dummy_${k}`, 2, "front", DUMMIES[k].items.slice(0, items.length));
    const buddy = unit("B", "dummy_mm", 2, "mid", []);
    const state = mkState([me, t, buddy]);
    const taken = itemDamageTaken(t, { state, isSkill: true, preview: true } as never);
    const P = (n: number) => (n * taken / t.maxHp) * 100;
    // đòn đánh (kèm nội tại onAttack của tướng), W bật nếu W là chiêu cường hoá đòn đánh
    const atkFx = (): number => {
      const fx = computeAttack(state, me, { kind: "unit", id: t.id });
      const proc = runHook(me, "onAttack", { state, target: t, isAttack: true, effects: fx, preview: false } as never);
      return (dmgOn(fx, t) + dmgOn(proc as Fx[], t)) * (1 + statsOf(me).extraAtk);
    };
    const base = { stacks: new Map(me.stacks as Map<string, number>), statuses: new Map(me.statuses as Map<string, number>) };
    const reset = () => { me.stacks = new Map(base.stacks) as never; me.statuses = new Map(base.statuses) as never; };
    out[`đánh→${k}`] = pct(P(atkFx()));
    const skills = (CARDS[defId] as HeroCard).skills;
    const dmg: number[] = [], cost: number[] = [];
    const cast = (s: string) => {
      const ids = skillTargets(state, me, s);
      const tid = ids.includes(t.id) ? t.id : SKILLS[s].target === "enemyAny" ? t.id : undefined;
      const fx = computeSkill(state, me, s, tid);
      // chiêu bật cờ / trạng thái cường hoá đòn đánh (Malphite W, Leona Q, Blitzcrank W)
      fx.forEach((f) => {
        if (f.type === "stack" && f.unitId === me.id && f.key.startsWith("t:")) (me.stacks as Map<string, number>).set(f.key, f.set ?? 1);
        if (f.type === "status" && f.unitId === me.id && f.status === "empower") (me.statuses as Map<string, number>).set(f.status, f.turns);
      });
      return P(dmgOn(fx, t));
    };
    for (const s of skills) {
      reset();
      const key = s.split("_").pop()!.toUpperCase();
      dmg.push(cast(s)); cost.push(skillCost(me, s));
      if (dmg[dmg.length - 1] > 0) out[`${key}→${k}`] = pct(dmg[dmg.length - 1]);
    }
    // cả lượt: tập chiêu tốt nhất trong 100 Mana (Mana tối đa) + 1 lượt đánh (có cường hoá nếu chiêu bật nó)
    let best = 0, bestSet = "";
    for (let mask = 0; mask < 1 << skills.length; mask++) {
      const pick = skills.filter((_, i) => mask & (1 << i));
      if (pick.reduce((sum, s) => sum + skillCost(me, s), 0) > 100) continue;
      reset();
      let d = 0;
      for (const s of pick) d += cast(s);
      d += P(atkFx());
      if (d > best) { best = d; bestSet = pick.map((s) => s.split("_").pop()!.toUpperCase()).join(""); }
    }
    reset();
    out[`cả lượt→${k}`] = `${pct(best)} ${bestSet}`;
  }
  return out;
}

// ================= 2) + 3) MÔ PHỎNG ĐỘI =================
/** Thứ tự ưu tiên tung chiêu trong mô phỏng (chiêu bảo kê / mở giao tranh trước) */
const PRIORITY: Record<string, string> = { malphite: "REQW", braum: "EWRQ", leona: "RWEQ", blitzcrank: "QREW", thresh: "WQRE", janna: "ERQW", soraka: "WRQE" };
const ENEMY_DPS = 200; // sát thương 1 tướng địch gây ra mỗi lượt (để quy Kiệt Sức / Kiên Cường ra số)
const TRUE_DMG = 250;  // sát thương chuẩn dồn vào chính tướng này mỗi lượt địch
type Sim = { shield: number; heal: number; guardAlly: number; stun: number; moved: number; exhaust: number; drain: number; turnsAlive: number; selfSustain: number; turns: number };
function simulate(defId: string, items: string[], hurt = true): Sim {
  seq = 0;
  const role = (CARDS[defId] as HeroCard).role;
  const me = unit("A", defId, 2, role === "tank" ? "front" : "mid", items);
  // đội mình: xạ thủ đứng sau, pháp sư chéo, đấu sĩ bên cạnh (đều 60% máu để hồi máu có tác dụng)
  const allies = [unit("A", "dummy_mm", 2, role === "tank" ? "mid" : "back", [], 0.6), unit("A", "dummy_mage", 1, "mid", [], 0.6), unit("A", "dummy_tank", 3, "front", [], 0.6)];
  // địch: tank + xạ thủ đường 2, đấu sĩ đường 1, pháp sư đường 3 (hậu tuyến)
  const foes = [unit("B", "dummy_tank", 2, "front"), unit("B", "dummy_mm", 2, "back"), unit("B", "dummy_tank", 1, "front"), unit("B", "dummy_mage", 3, "back")];
  const state = mkState([me, ...allies, ...foes]);
  const st = () => statsOf(me);
  const r: Sim = { shield: 0, heal: 0, guardAlly: 0, stun: 0, moved: 0, exhaust: 0, drain: 0, turnsAlive: 0, selfSustain: 0, turns: 0 };
  let mana = 30;
  const cds = new Map<string, number>();
  const skills = (PRIORITY[defId] ?? "QWER").split("").map((k) => `${defId}_${k.toLowerCase()}`);
  const T = 8;
  let alive = true, selfGain = 0;
  for (let turn = 1; turn <= 30 && alive; turn++) {
    // đầu lượt
    if (turn <= T) r.turns = turn;
    cds.forEach((v, k) => cds.set(k, Math.max(0, v - 1)));
    if (turn > 1) mana = Math.min(100, mana + 10 + st().manaRegen);
    for (const fx of runHook(me, "onTurnStart", { state, preview: false } as never)) applyFx(fx, turn);
    allies.forEach((a) => { a.hp = Math.round(a.maxHp * 0.6); }); // đồng minh luôn bị đánh về 60% (đo lượng hồi có ích)
    for (const s of skills) {
      if ((cds.get(s) ?? 0) > 0) continue;
      if (mana < skillCost(me, s)) { if (s === skills[0]) break; continue; } // chiêu ưu tiên số 1 sẵn sàng mà thiếu Mana: để dành
      const ids = skillTargets(state, me, s);
      const def = SKILLS[s];
      let tid: string | undefined;
      if (def.target !== "none") {
        if (!ids.length) continue;
        const allyIds = ids.filter((id) => state.units.get(id)!.owner === "A");
        // ưu tiên: carry phe mình (khiên/hồi), carry phe địch (sát thương)
        tid = allyIds.length ? (allyIds.find((id) => id !== me.id && isCarry(state.units.get(id)!)) ?? allyIds.find((id) => id !== me.id) ?? allyIds[0])
          : (ids.find((id) => isCarry(state.units.get(id)!)) ?? ids[0]);
      }
      const fx = computeSkill(state, me, s, tid);
      mana -= skillCost(me, s);
      if (process.env.DBG) console.log(turn, s, tid, mana, fx.filter((f) => f.type === "shield" || f.type === "heal").map((f) => JSON.stringify(f)).join(" "));
      cds.set(s, def.cooldown);
      for (const f of fx) applyFx(f, turn);
    }
    // đòn đánh thường lên tướng địch đứng đầu đường (chạy nội tại onAttack của tướng: Leona Q, Braum Ngất Ngư...)
    const foe = foes[0];
    const atk = computeAttack(state, me, { kind: "unit", id: foe.id });
    for (const f of runHook(me, "onAttack", { state, target: foe, isAttack: true, effects: atk, preview: false } as never)) applyFx(f, turn);
    me.stacks.forEach((_v, k) => { if (k.startsWith("t:")) (me.stacks as Map<string, number>).delete(k); });
    mana = Math.min(100, mana + 10 + 10); // đòn đánh + bị trúng 2 đòn
    // hết lượt mình: trạng thái của mình giảm 1 (Kiên Cường 2 vòng còn 1 cho lượt địch)
    (me.statuses as Map<string, number>).forEach((v, k, m) => (v <= 1 ? m.delete(k) : m.set(k, v - 1)));
    // lượt địch: dồn sát thương chuẩn vào mình
    const dmg = hurt ? Math.round(TRUE_DMG * damageTakenMult(me)) : 0;
    const absorbed = Math.min(me.shield, dmg);
    me.shield -= absorbed; me.hp -= dmg - absorbed;
    if (me.hp <= 0) alive = false; else r.turnsAlive = turn;
    if (turn === T) r.selfSustain = Math.round(selfGain / T);
  }
  if (r.turnsAlive < T) r.selfSustain = Math.round(selfGain / Math.max(1, r.turnsAlive));
  return r;

  function applyFx(f: Fx, turn: number) {
    const inT = turn <= T;
    if (f.type === "shield") {
      const u = state.units.get(f.unitId)!;
      u.shield += f.amount;
      if (u.id === me.id) selfGain += f.amount; else if (inT) r.shield += f.amount;
    } else if (f.type === "heal") {
      const u = state.units.get(f.unitId)!;
      const n = Math.min(f.amount, u.maxHp - u.hp);
      u.hp += n;
      if (u.id === me.id) selfGain += n; else if (inT) r.heal += n;
    } else if (f.type === "status") {
      const u = state.units.get(f.unitId)!;
      if (u.owner === "A" && u.id !== me.id && f.status === "guard" && inT) r.guardAlly++;
      if (u.owner === "B" && f.status === "stun" && inT) r.stun++;
      if (u.id === me.id) (me.statuses as Map<string, number>).set(f.status, Math.max(f.turns, me.statuses.get(f.status) ?? 0));
    } else if (f.type === "buff") {
      if (f.buffId === "exhaust" && inT) r.exhaust++;
    } else if (f.type === "heroMana") {
      if (state.units.get(f.unitId)?.owner === "B" && inT) r.drain -= f.amount;
    } else if ((f.type === "pull" || f.type === "displace") && inT) {
      if (state.units.get(f.unitId)?.owner === "B") r.moved++;
    } else if (f.type === "stack") {
      const m = state.units.get(f.unitId)!.stacks as Map<string, number>;
      const cur = m.get(f.key) ?? 0;
      let next = f.set ?? cur + (f.add ?? 0);
      if (f.max !== undefined) next = Math.min(f.max, next);
      m.set(f.key, next);
    } else if (f.type === "damage" && f.target.kind === "unit" && f.target.id === me.id) {
      me.hp -= f.amount; // Soraka hiến máu
      selfGain -= f.amount;
    }
  }
}

const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(BUILDS);
for (const id of ids) {
  const builds: Record<string, string[]> = { "không đồ": [], ...BUILDS[id] };
  console.log(`\n=========== ${id.toUpperCase()} ===========`);
  console.table(Object.entries(builds).map(([n, items]) => {
    seq = 0;
    const me = unit("A", id, 2, "front", items);
    return { Build: n, "Đồ": items.join(" + ") || "-", AD: atkOf(me), AP: apOf(me), Máu: me.maxHp, "Máu+": bonusHpOf(me), Giáp: armorOf(me), "Kháng phép": mrOf(me), "Mana/vòng": statsOf(me).manaRegen };
  }));
  console.table(Object.entries(builds).map(([n, items]) => damageRow(id, n, items)));
  console.table(Object.entries(builds).map(([n, items]) => {
    const s = simulate(id, items, false); // đội: giả sử mình không bị dồn chết
    const hurt = simulate(id, items, true), alive = hurt.turnsAlive;
    const T = Math.max(1, s.turns);
    const team = s.shield + s.heal + s.guardAlly * ENEMY_DPS * 0.3 + s.exhaust * ENEMY_DPS * 0.4;
    return {
      Build: n, "Khiên đội/lượt": Math.round(s.shield / T), "Hồi đội/lượt": Math.round(s.heal / T), "Kiên Cường đồng minh": s.guardAlly,
      "Kiệt Sức địch": s.exhaust, "Choáng địch": s.stun, "Kéo/đẩy địch": s.moved, "Mana địch bị hút": s.drain,
      "Bảo kê đội/lượt (quy đổi)": Math.round(team / T), "Kể cả choáng/lượt": Math.round((team + s.stun * ENEMY_DPS * 0.5) / T), "Tự khiên+hồi/lượt": hurt.selfSustain, [`Sống được (${TRUE_DMG} chuẩn/lượt)`]: alive >= 30 ? "30+" : alive,
    };
  }));
}
