// Jinx: xạ thủ cuồng loạn. Đổi súng tên lửa nổ lan, hạ gục thì Phấn Khích, R tên lửa toàn bản đồ.
import { frontMost, hit, laneEnemies, other, scaled, status } from "../helpers";
import * as C from "../items/conditions";
import { defineHero } from "../registry";
import { mainDamageOf, setStackFx, targetOf } from "./kit";

export default defineHero({
  id: "jinx", name: "Jinx", role: "marksman", armor: 20, mr: 20,
  atk: 70, ap: 10, hp: 520,
  desc: "Khẩu pháo lỏng ốc. Đổi súng tên lửa nổ lan cả lane, hạ gục thì Phấn Khích bắn liên thanh.",
  strength: "Dọn dẹp giao tranh: hạ gục được đánh tiếp và tăng tốc",
  concept: "Lăn cầu tuyết: Phấn Khích sau mỗi hạ gục",
  passive: { name: "Hưng Phấn!", desc: "Khi Jinx hạ gục một tướng, Jinx được **đánh thêm 1 lần** và nhận Cường Hoá 2 vòng. Khi đang Cường Hoá, Jinx được **+40% Tốc đánh**." },
  onKill: ({ unit }) => [{ type: "refresh", unitId: unit.id }, status(unit, "empower", 2)],
  props: [
    { name: "Phấn Khích!", desc: "Khi Cường Hoá: +40% Tốc đánh.", condition: C.selfHas("empower"), stats: { extraAtk: 0.4 } },
    { name: "Cá Mập Tên Lửa", desc: "Chế độ tên lửa: +10% sát thương, nổ lan 60% sang tướng còn lại trong lane.",
      condition: C.all(C.isAttack, C.flagOn("t:jinx_rocket", "đang dùng tên lửa")), damageMult: () => 1.1,
      onAttack: (c) => {
        if (!c.state || !c.target) return [];
        const other2 = laneEnemies(c.state, other(c.self.owner), c.target.lane).find((x) => x.id !== c.target!.id);
        return other2 ? [hit(other2, mainDamageOf(c.effects, c.target) * 0.6, "Tên Lửa (nổ lan)")] : [];
      } },
  ],
  skills: [
    {
      def: { id: "jinx_q", key: "Q", name: "Tráo Hàng!", mana: 10, cooldown: 1, target: "none",
        desc: "Lượt này, đòn đánh của Jinx gây thêm 10% sát thương và **nổ lan 60%** sát thương sang 1 tướng địch khác cùng đường với mục tiêu." },
      resolve: ({ unit }) => [setStackFx(unit, "t:jinx_rocket", 1)],
    },
    {
      def: { id: "jinx_w", key: "W", name: "Giật Bắn!", mana: 25, cooldown: 2, target: "enemyAny",
        desc: "Chọn 1 tướng địch bất kỳ. Gây {40 + 120% AD} sát thương vật lý cho tướng đó và gây **Buốt** 2 vòng." },
      boosts: [{ condition: C.targetIsolated, desc: "gây thêm 30% sát thương", mult: 1.3 }],
      resolve: ({ state, unit, targetId }) => {
        const t = targetOf(state, targetId);
        return t ? [hit(t, scaled(unit, t, "physical", 40, 1.2), "Giật Điện!"), status(t, "chill", 2)] : [];
      },
    },
    {
      def: { id: "jinx_e", key: "E", name: "Lựu Đạn Ma Hỏa!", mana: 20, cooldown: 3, target: "none",
        desc: "Tướng đứng đầu đường bên địch nhận {50 + 50% AP} sát thương phép và bị **Choáng 1 vòng**." },
      boosts: [{ condition: C.targetRole("assassin", "fighter"), desc: "tướng đó bị Choáng 2 vòng thay vào đó", extra: ({ target }) => [status(target, "stun", 2)] }],
      resolve: ({ state, unit }) => {
        const t = frontMost(state, other(unit.owner), unit.lane);
        return t ? [hit(t, scaled(unit, t, "magic", 50, 0, 0.5), "Bẫy Chomper!"), status(t, "stun", 1)] : [];
      },
    },
    {
      def: { id: "jinx_r", key: "R", name: "Tên Lửa Đạn Đạo Siêu Khủng Khiếp!", mana: 60, cooldown: 4, target: "enemyAny",
        desc: "Chọn 1 tướng địch bất kỳ. Gây {150 + 110% AD} sát thương vật lý cho tướng đó, cộng thêm **25% máu đã mất** của tướng đó." },
      boosts: [{ condition: C.targetHpBelow(0.4), desc: "gây thêm 30% sát thương", mult: 1.3 }],
      resolve: ({ state, unit, targetId }) => {
        const t = targetOf(state, targetId);
        return t ? [hit(t, scaled(unit, t, "physical", 150 + 0.25 * (t.maxHp - t.hp), 1.1), "Tên Lửa Siêu Khủng Khiếp")] : [];
      },
    },
  ],
});
