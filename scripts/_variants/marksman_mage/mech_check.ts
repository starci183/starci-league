// Kiểm cơ chế vị trí/điều kiện của 8 tướng bằng computeSkill (không cần server). Chạy: npx tsx scripts/_variants/marksman_mage/mech_check.ts
import { CARDS, HeroCard, UnitLike, Effect, computeSkill, computeAttack, SKILLS, skillTargets, skillCells, getHero, unitsInArea, AreaShape } from "@starci/shared";

let seq = 0;
function mk(owner: string, defId: string, lane: number, row: string, extra: Partial<UnitLike> = {}): UnitLike {
  const h = CARDS[defId] as HeroCard;
  return { id: `u${++seq}`, owner, defId, lane, row, hp: h.hp, maxHp: h.hp, shield: 0, atkBonus: 0, mana: 100, status: "board",
    readyTurn: 0, attacked: false, castThisTurn: false, empowered: false, hidden: false, summonedTurn: -1, markedTargetId: "", moved: false,
    cooldowns: new Map(), statuses: new Map(), stacks: new Map(), items: [], ...extra } as unknown as UnitLike;
}
const st = (...us: UnitLike[]) => ({ turn: 9, activeSide: "A", units: new Map(us.map((u) => [u.id, u])) }) as never;
const has = (fx: Effect[], pred: (f: Effect) => boolean) => fx.some(pred);
const stunOn = (fx: Effect[], u: UnitLike, s = "stun") => fx.filter((f) => f.type === "status" && f.unitId === u.id && f.status === s).map((f) => (f as { turns: number }).turns);
const dmgOn = (fx: Effect[], u: UnitLike) => fx.reduce((s, f) => (f.type === "damage" && f.target.kind === "unit" && f.target.id === u.id ? s + f.amount : s), 0);
let fails = 0;
const ok = (name: string, cond: boolean, info = "") => { console.log(`${cond ? "OK  " : "FAIL"} ${name}${info ? `  (${info})` : ""}`); if (!cond) fails++; };

// ---- Vayne E: đập tường / va đồng đội / sát thủ ----
{
  const v = mk("A", "vayne", 2, "back"), back = mk("B", "lux", 2, "back");
  let fx = computeSkill(st(v, back), v, "vayne_e", back.id);
  ok("Vayne E: hậu tuyến bị ghim tường → choáng", stunOn(fx, back).length > 0);
  const front = mk("B", "lux", 2, "front");
  const free = computeSkill(st(v, front), v, "vayne_e", front.id);
  ok("Vayne E: tiền tuyến, sau lưng trống → chỉ đẩy lùi, không choáng", stunOn(free, front).length === 0 && has(free, (f) => f.type === "displace"));
  const ally = mk("B", "braum", 2, "mid");
  fx = computeSkill(st(v, front, ally), v, "vayne_e", front.id);
  ok("Vayne E: va đồng đội đứng sau → choáng + 1.5×", stunOn(fx, front).length > 0 && dmgOn(fx, front) > dmgOn(free, front) * 1.4, `${dmgOn(free, front)} → ${dmgOn(fx, front)}`);
  const zed = mk("B", "zed", 2, "front");
  fx = computeSkill(st(v, zed), v, "vayne_e", zed.id);
  ok("Vayne E: sát thủ bị choáng dù không va tường", stunOn(fx, zed).length > 0);
  const solo = mk("B", "lux", 2, "front");
  fx = computeSkill(st(v, solo), v, "vayne_w");
  ok("Vayne W: đấu tay đôi → Chú Tâm 3 vòng", stunOn(fx, v, "focus")[0] === 3);
  fx = computeSkill(st(v, solo, mk("B", "braum", 2, "mid")), v, "vayne_w");
  ok("Vayne W: 2 địch cùng đường → 2 vòng", stunOn(fx, v, "focus")[0] === 2);
  const vq = mk("A", "vayne", 2, "back", { statuses: new Map([["empower", 2]]) } as never);
  fx = computeSkill(st(vq), vq, "vayne_q");
  ok("Vayne Q: đang R → hóa ẩn + đi thêm", has(fx, (f) => f.type === "hide") && has(fx, (f) => f.type === "freeMove"));
  const low = mk("A", "vayne", 2, "back", { hp: 200 } as never);
  fx = computeSkill(st(low), low, "vayne_r");
  ok("Vayne R: dưới 50% máu → hồi máu", has(fx, (f) => f.type === "heal"));
}
// ---- Kog W: ≥3 địch quanh mình → hoàn mana ----
{
  const k = mk("A", "kogmaw", 2, "back");
  const fx = computeSkill(st(k, mk("B", "braum", 1, "front"), mk("B", "lux", 2, "back"), mk("B", "zed", 3, "front")), k, "kogmaw_w");
  ok("Kog W: 3 địch quanh → hoàn 15 mana", has(fx, (f) => f.type === "heroMana" && f.amount === 15));
  const fx2 = computeSkill(st(k, mk("B", "braum", 2, "front")), k, "kogmaw_w");
  ok("Kog W: 1 địch → không hoàn", !has(fx2, (f) => f.type === "heroMana"));
}
// ---- Ashe ----
{
  const a = mk("A", "ashe", 1, "back"), wallT = mk("B", "braum", 0, "front"), mid = mk("B", "braum", 1, "front");
  let fx = computeSkill(st(a, wallT, mid), a, "ashe_w");
  ok("Ashe W: tướng ở đường biên bị Đóng băng, đường giữa thì không", stunOn(fx, wallT, "freeze").length > 0 && stunOn(fx, mid, "freeze").length === 0);
  const hid = mk("B", "zed", 3, "front", { hidden: true } as never);
  const s = st(a, hid);
  ok("Ashe E: chọn được tướng đang ẩn", skillTargets(s, a, "ashe_e").includes(hid.id));
  fx = computeSkill(s, a, "ashe_e", hid.id);
  ok("Ashe E: tướng ẩn bị lộ diện + choáng", has(fx, (f) => f.type === "reveal") && stunOn(fx, hid).length > 0);
  const far = mk("B", "lux", 4, "back"), near = mk("B", "braum", 4, "mid");
  fx = computeSkill(st(a, far, near), a, "ashe_r", far.id);
  ok("Ashe R: đường khác → choáng 2, tướng kề bị Buốt", stunOn(fx, far).includes(2) && stunOn(fx, near, "chill").length > 0);
  const chilled = mk("B", "lux", 1, "front", { statuses: new Map([["chill", 1]]) } as never);
  const af = mk("A", "ashe", 1, "back", { statuses: new Map([["focus", 1]]) } as never);
  const fxA = computeAttack(st(af, chilled), af, { kind: "unit", id: chilled.id });
  ok("Ashe Q: Chú Tâm bắn thêm 2 mũi", fxA.filter((f) => f.type === "damage" && f.label === "Chú Tâm Tiễn").length >= 2);
}
// ---- Jinx: nổ dây chuyền ----
{
  const j = mk("A", "jinx", 2, "back"), f1 = mk("B", "braum", 2, "front"), n1 = mk("B", "lux", 1, "front");
  const diag = mk("B", "lux", 1, "mid");
  let fx = computeSkill(st(j, f1, n1, diag), j, "jinx_e", undefined, false, { lane: 2, row: "front" });
  ok("Jinx E: bẫy thập tự trúng tâm + bên cạnh (choáng), không trúng ô chéo; đặt vùng 1 lượt",
    stunOn(fx, f1).length > 0 && stunOn(fx, n1).length > 0 && dmgOn(fx, diag) === 0 && has(fx, (f) => f.type === "zone" && f.turns === 1));
  ok("Jinx E: chỉ chọn ô ở 3 đường quanh mình", skillCells(st(j), j, "jinx_e").every((c) => Math.abs(c.lane - 2) <= 1));
  fx = computeSkill(st(j, f1, n1), j, "jinx_r", f1.id);
  ok("Jinx R: nổ lan sang tướng kề", dmgOn(fx, n1) > 0);
  const jr = mk("A", "jinx", 2, "back", { stacks: new Map([["t:jinx_rocket", 1]]) } as never);
  const fxA = computeAttack(st(jr, f1, n1), jr, { kind: "unit", id: f1.id }, false);
  void fxA;
}
// ---- Ahri ----
{
  const h = mk("A", "ahri", 2, "back"), side = mk("B", "lux", 3, "back");
  let fx = computeSkill(st(h, side), h, "ahri_e", side.id);
  ok("Ahri E: đường kề → kéo sang đường Ahri", has(fx, (f) => f.type === "displace" && f.dLane === -1));
  ok("Ahri E: đứng một mình → choáng 2", stunOn(fx, side).includes(2));
  const same = mk("B", "lux", 2, "back"), tank = mk("B", "braum", 2, "front");
  fx = computeSkill(st(h, same, tank), h, "ahri_e", same.id);
  ok("Ahri E: cùng đường → kéo lên 1 hàng, không đứng một mình → choáng 1", has(fx, (f) => f.type === "displace" && f.dRow === -1) && !stunOn(fx, same).includes(2));
  fx = computeSkill(st(h, side), h, "ahri_w");
  ok("Ahri W: 1 mục tiêu nhận cả 3 ngọn", fx.filter((f) => f.type === "damage").length >= 3);
}
// ---- Annie ----
{
  const an = mk("A", "annie", 2, "back"), fr = mk("A", "braum", 2, "mid"), e = mk("B", "braum", 2, "front");
  const withF = computeSkill(st(an, fr, e), an, "annie_e", fr.id), alone = computeSkill(st(an, e), an, "annie_e", an.id);
  const sh = (fx: Effect[]) => fx.reduce((s, f) => (f.type === "shield" ? s + f.amount : s), 0);
  ok("Annie E: có đồng minh đứng kề → khiên +30%", sh(withF) > sh(alone) * 1.25, `${sh(alone)} → ${sh(withF)}`);
  const side = mk("B", "lux", 1, "front"), far = mk("B", "zed", 4, "front");
  const s3 = st(an, e, side, far);
  let fx = computeSkill(s3, an, "annie_r", undefined, false, { lane: 2, row: "front" });
  ok("Annie R: Tibbers 3×3 trúng tướng kề, không trúng tướng xa, đứng lại 2 lượt", dmgOn(fx, side) > 0 && dmgOn(fx, far) === 0 && has(fx, (f) => f.type === "zone" && f.turns === 2));
  const z = { id: "z", key: "tibbers", owner: "A", defId: "annie", srcId: an.id, side: "B", lane: 2, row: 0, shape: "3x3", turns: 2 };
  const tick = getHero("annie")!.zoneTick!({ state: s3, unit: an, zone: z, targets: unitsInArea(s3, "B", "3x3" as AreaShape, { lane: 2, row: 0 }) });
  ok("Annie R: Tibbers đốt mỗi lượt trong vùng", dmgOn(tick, e) > 0 && dmgOn(tick, side) > 0 && dmgOn(tick, far) === 0);
  const back = mk("B", "lux", 2, "mid"), diag = mk("B", "zed", 1, "mid");
  fx = computeSkill(st(an, e, back, diag), an, "annie_w", e.id);
  ok("Annie W: thập tự trúng ô sau, không trúng ô chéo", dmgOn(fx, back) > 0 && dmgOn(fx, diag) === 0);
}
// ---- Lissandra ----
{
  const l = mk("A", "lissandra", 2, "back", { hp: 200 } as never), t = mk("B", "braum", 2, "front"), n = mk("B", "zed", 1, "front");
  let fx = computeSkill(st(l, t, n), l, "lissandra_r", t.id);
  ok("Lissandra R: tự phong ấn hồi máu đúng 1 lần dù trúng 2 tướng", fx.filter((f) => f.type === "heal").length === 1 && stunOn(fx, l, "invuln").length === 1);
  const z = mk("B", "zed", 2, "mid");
  fx = computeSkill(st(l, t, z), l, "lissandra_w");
  ok("Lissandra W: tướng đầu + sát thủ bị Đóng băng", stunOn(fx, t, "freeze").length > 0 && stunOn(fx, z, "freeze").length > 0);
}
// ---- Lux ----
{
  const x = mk("A", "lux", 2, "back"), ally = mk("A", "braum", 3, "front", { hp: 300 } as never);
  const s = st(x, ally);
  ok("Lux W: chọn được đồng minh đường kề", skillTargets(s, x, "lux_w").includes(ally.id));
  const fx = computeSkill(s, x, "lux_w", ally.id);
  ok("Lux W: khiên đồng minh (×1.5 khi yếu) + Lux nhận 50%", fx.filter((f) => f.type === "shield").length === 2);
  const t = mk("B", "braum", 3, "front"), b = mk("B", "lux", 3, "mid");
  const fq = computeSkill(st(x, t, b), x, "lux_q", t.id);
  ok("Lux Q: đường kề, trói cả tướng đứng sau", stunOn(fq, t).length > 0 && stunOn(fq, b).length > 0);
  const side = mk("B", "zed", 4, "front"), far = mk("B", "zed", 1, "front");
  const fe = computeSkill(st(x, t, b, side, far), x, "lux_e", undefined, false, { lane: 3, row: "front" });
  ok("Lux E: vùng 2×2 (tâm + bên cạnh + hàng sau), không trúng đường khác", dmgOn(fe, b) > 0 && dmgOn(fe, side) > 0 && dmgOn(fe, far) === 0);
}
console.log(fails ? `\n${fails} lỗi` : "\nTất cả OK");
void SKILLS;
