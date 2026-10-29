// Vayne: xạ thủ săn đêm. Mũi Tên Bạc đốt % máu chuẩn mỗi 3 đòn, lộn nhào tàng hình, Kết Án ghim tường.
import { hit, scaled, stackOf, status } from "../helpers";
import * as C from "../items/conditions";
import { defineHero } from "../registry";
import type { Effect } from "../types";
import { enemyIdsInLane, setStackFx, stackFx, targetOf } from "./kit";

export default defineHero({
  id: "vayne", name: "Vayne", role: "marksman", armor: 20, mr: 20,
  atk: 70, ap: 0, hp: 520,
  desc: "Thợ săn bóng đêm. Mỗi 3 đòn trúng cùng mục tiêu: sát thương chuẩn theo % máu tối đa.",
  strength: "Sát thương chuẩn theo máu tối đa: tank trâu cỡ nào cũng tan",
  counter: "Đỡ đòn: Mũi Tên Bạc bỏ qua giáp",
  passive: { name: "Thợ Săn Bóng Đêm", desc: "Mỗi **đòn đánh thứ 3** trúng cùng 1 tướng: gây thêm 20 + 7% máu tối đa của tướng đó **Sát thương chuẩn**." },
  props: [
    { name: "Mũi Tên Bạc", desc: "Mỗi 3 đòn đánh trúng cùng mục tiêu: 20 + 7% máu tối đa (chuẩn).",
      onAttack: (c): Effect[] => {
        if (!c.target) return [];
        if (stackOf(c.target, "vayne_ring") + 1 >= 3) return [setStackFx(c.target, "vayne_ring", 0), hit(c.target, 20 + c.target.maxHp * 0.07, "Mũi Tên Bạc")];
        return [stackFx(c.target, "vayne_ring", 1)];
      } },
    { name: "Lộn Nhào", desc: "Sau Q: đòn đánh +50%.", condition: C.all(C.isAttack, C.flagOn("t:vayne_q", "vừa lộn nhào")), damageMult: () => 1.5 },
    { name: "Thợ Săn Bóng Đêm", desc: "Khi Chú Tâm (W): +40% Tốc đánh.", condition: C.selfHas("focus"), stats: { extraAtk: 0.4 } },
    { name: "Giờ Khắc Cuối Cùng", desc: "Khi Cường Hoá (R): +30% AD.", condition: C.selfHas("empower"), stats: { atkMult: 0.3 } },
  ],
  skills: [
    {
      def: { id: "vayne_q", key: "Q", name: "Nhào Lộn", mana: 15, cooldown: 1, target: "none",
        desc: "Lượt này, đòn đánh của Vayne gây **thêm 50% sát thương**. Nếu Vayne đang Cường Hoá, Vayne còn **hóa ẩn**." },
      boosts: [],
      resolve: ({ unit }) => [setStackFx(unit, "t:vayne_q", 1), ...(unit.statuses.get("empower") ? [{ type: "hide" as const, unitId: unit.id }] : [])],
    },
    {
      def: { id: "vayne_w", key: "W", name: "Mũi Tên Bạc", mana: 20, cooldown: 3, target: "none",
        desc: "Vayne nhận **+40% Tốc đánh** trong 2 vòng." },
      resolve: ({ unit }) => [status(unit, "focus", 2)],
    },
    {
      def: { id: "vayne_e", key: "E", name: "Kết Án", mana: 25, cooldown: 2, target: "enemyAny",
        desc: "Chọn 1 tướng địch cùng đường. Gây {50 + 50% AD} sát thương vật lý cho tướng đó." },
      targets: ({ state, unit }) => enemyIdsInLane(state, unit),
      boosts: [{ condition: C.targetRow("back"), desc: "tướng đó bị **ghim vào tường**: chịu thêm 50% sát thương và bị Choáng 1 vòng", mult: 1.5, extra: ({ target }) => [status(target, "stun", 1)] }],
      resolve: ({ state, unit, targetId }) => {
        const t = targetOf(state, targetId);
        return t ? [hit(t, scaled(unit, t, "physical", 50, 0.5), "Kết Án")] : [];
      },
    },
    {
      def: { id: "vayne_r", key: "R", name: "Giờ Khắc Cuối Cùng", mana: 50, cooldown: 4, target: "none",
        desc: "Vayne được Cường Hoá 3 vòng: nhận **+30% AD**, và Q khiến Vayne **hóa ẩn**." },
      resolve: ({ unit }) => [status(unit, "empower", 3)],
    },
  ],
});
