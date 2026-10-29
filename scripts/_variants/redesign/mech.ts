// Kiểm tra nhanh cơ chế mới: Tường Băng chặn đi, Katarina cướp bùa, Aatrox truyền sát thương xích, Thresh đổi chỗ, Ahri mê hoặc.
import { CARDS, HeroCard, UnitLike, computeSkill, computeAttack, moveTargets, isWallCell } from "@starci/shared";
let seq = 0;
const mk = (owner: string, id: string, lane: number, row: string, extra: Partial<Record<string, unknown>> = {}): UnitLike => {
  const h = CARDS[id] as HeroCard;
  return { id: `u${++seq}`, owner, defId: id, lane, row, hp: h.hp, maxHp: h.hp, shield: 0, atkBonus: 0, mana: 999, status: "board", readyTurn: 0,
    attacked: false, castThisTurn: false, empowered: false, hidden: false, summonedTurn: 0, markedTargetId: "", moved: false,
    cooldowns: new Map(), statuses: new Map(), stacks: new Map(), items: [], ...extra } as unknown as UnitLike;
};
const st = (...us: UnitLike[]) => ({ turn: 9, activeSide: "A", units: new Map(us.map((u) => [u.id, u])), zones: [] as unknown[] });
const brief = (fx: ReturnType<typeof computeSkill>) => fx.map((f) => f.type === "damage" ? `dmg ${f.target.kind === "unit" ? f.target.id : "tower"} ${f.amount}${f.label ? " " + f.label : ""}` : `${f.type} ${JSON.stringify(f).slice(0, 90)}`);

// 1) Lissandra W đặt tường; tướng B trong tường không đi được, ô tường bị loại
const L = mk("A", "lissandra", 2, "back"), b1 = mk("B", "jinx", 2, "mid", { moved: true }), b2 = mk("B", "braum", 1, "front");
const s1 = st(L, b1, b2);
const wfx = computeSkill(s1 as never, L, "lissandra_w", undefined, false, { lane: 2, row: "front" });
console.log("Liss W:", brief(wfx));
const z = wfx.find((f) => f.type === "zone")!; s1.zones.push({ id: "z1", owner: "A", defId: "lissandra", ...z });
s1.activeSide = "B"; s1.turn = 10;
console.log("jinx (trong tường) đi được:", moveTargets(s1 as never, b1).length, "· braum đi được:", JSON.stringify(moveTargets(s1 as never, b2)));
console.log("ô (2,front) là tường:", isWallCell(s1 as never, "B", 2, 0));

// 2) Katarina Q cướp bùa / Cường Hoá
const K = mk("A", "katarina", 2, "front"), t = mk("B", "jinx", 2, "mid");
(t.statuses as Map<string, number>).set("empower", 2); (t.stacks as Map<string, number>).set("buff:baron", 3);
console.log("Kat Q:", brief(computeSkill(st(K, t) as never, K, "katarina_q", t.id)));
console.log("Kat E:", brief(computeSkill(st(K, t) as never, K, "katarina_e", t.id)));

// 3) Aatrox W xích support + carry kề nhau, rồi Q live (hook truyền 40%)
const A = mk("A", "aatrox", 2, "front"), sup = mk("B", "janna", 2, "front"), adc = mk("B", "jinx", 2, "mid");
const s3 = st(A, sup, adc);
console.log("Aatrox W:", brief(computeSkill(s3 as never, A, "aatrox_w", sup.id)));
(sup.stacks as Map<string, number>).set("aatrox_link", 9); (adc.stacks as Map<string, number>).set("aatrox_link", 9);
console.log("Aatrox Q (live):", brief(computeSkill(s3 as never, A, "aatrox_q", sup.id, true)));
console.log("Aatrox đánh (live):", brief(computeAttack(s3 as never, A, { kind: "unit", id: sup.id }, true)));

// 4) Thresh W lên đồng minh bị choáng: giải + đổi chỗ
const T = mk("A", "thresh", 2, "front"), ally = mk("A", "jinx", 1, "back");
(ally.statuses as Map<string, number>).set("stun", 1);
console.log("Thresh W:", brief(computeSkill(st(T, ally) as never, T, "thresh_w", ally.id)));

// 5) Ahri E mê hoặc xạ thủ đứng kề đồng đội
const H = mk("A", "ahri", 2, "back"), mm = mk("B", "jinx", 2, "mid"), mate = mk("B", "braum", 2, "front");
console.log("Ahri E:", brief(computeSkill(st(H, mm, mate) as never, H, "ahri_e", mm.id)));
