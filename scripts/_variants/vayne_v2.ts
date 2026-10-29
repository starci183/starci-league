// Bản Vayne ĐỀ XUẤT, chỉ để tính thử (không nạp vào game). Lối: đấu tay đôi một mục tiêu, ghim kẻ lao vào.
import { apOf, atkOf, hit, mixed, stackOf, status, defineHero, C, Effect } from "./shim";
import { enemyIdsInLane, setStackFx, stackFx, targetOf } from "../../packages/shared/src/heroes/kit";

export default defineHero({
  id: "vayne2", name: "Vayne (đề xuất)", role: "marksman", armor: 25, mr: 25,
  atk: 70, ap: 30, hp: 720,
  desc: "", strength: "", passive: { name: "", desc: "" },
  props: [
    { name: "Mũi Tên Bạc", desc: "Đòn thứ 3 cùng mục tiêu: {30 + 30% AD + 30% AP} chuẩn.",
      onAttack: (c): Effect[] => {
        if (!c.target) return [];
        if (stackOf(c.target, "vayne_ring") + 1 >= 3)
          return [setStackFx(c.target, "vayne_ring", 0), hit(c.target, 30 + 0.3 * atkOf(c.self) + 0.3 * apOf(c.self), "Mũi Tên Bạc", "true")];
        return [stackFx(c.target, "vayne_ring", 1)];
      } },
    { name: "Lộn Nhào", desc: "Sau Q: đòn đánh +50%.", condition: C.all(C.isAttack, C.flagOn("t:vayne_q", "vừa lộn nhào")), damageMult: () => 1.5 },
    { name: "Thợ Săn", desc: "W: +40% Tốc đánh, hút máu 15%.", condition: C.selfHas("focus"), stats: { extraAtk: 0.4, lifesteal: 0.15 } },
    { name: "Giờ Khắc", desc: "R: +30% AD, +30 AP.", condition: C.selfHas("empower"), stats: { atkMult: 0.3, ap: 30 } },
  ],
  skills: [
    { def: { id: "vayne2_q", key: "Q", name: "Nhào Lộn", mana: 15, cooldown: 1, target: "none", desc: "" },
      resolve: ({ unit }) => [setStackFx(unit, "t:vayne_q", 1)] },
    { def: { id: "vayne2_w", key: "W", name: "Thợ Săn", mana: 20, cooldown: 3, target: "none", desc: "" },
      resolve: ({ unit }) => [status(unit, "focus", 2)] },
    { def: { id: "vayne2_e", key: "E", name: "Kết Án", mana: 25, cooldown: 2, target: "enemyAny", desc: "" },
      targets: ({ state, unit }) => enemyIdsInLane(state, unit),
      boosts: [
        { condition: C.targetRow("back"), desc: "ghim tường ×1.5 + choáng", mult: 1.5, extra: ({ target }) => [status(target, "stun", 1)] },
        { condition: C.targetRole("assassin", "fighter"), desc: "đẩy lùi kẻ lao vào: choáng 1", extra: ({ target }) => [status(target, "stun", 1)] },
      ],
      resolve: ({ state, unit, targetId }) => {
        const t = targetOf(state, targetId);
        return t ? mixed(unit, t, "Kết Án", { physical: 50 + 0.5 * atkOf(unit), magic: 0.6 * apOf(unit) }) : [];
      } },
    { def: { id: "vayne2_r", key: "R", name: "Giờ Khắc Cuối Cùng", mana: 50, cooldown: 4, target: "none", desc: "" },
      resolve: ({ unit }) => [status(unit, "empower", 3)] },
  ],
});
