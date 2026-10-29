// Annie: pháp sư lửa. Cứ 4 chiêu thì chiêu kế tiếp làm choáng (Hỏa Cuồng), R gọi gấu Tibbers đốt cả lane.
import { apOf, hit, laneEnemies, other, scaled, stackOf, status } from "../helpers";
import * as C from "../items/conditions";
import { defineHero } from "../registry";
import type { ISkillBoost } from "../types";
import { enemyIdsInLane, lowHpBonus, setStackFx, shieldFx, stackFx, targetOf } from "./kit";

const pyroReady = C.flagOn("annie_stun", "Hỏa Cuồng sẵn sàng");
/** Hỏa Cuồng: khi sẵn sàng, chiêu kế tiếp làm Choáng 1 vòng */
const pyro: ISkillBoost = { condition: pyroReady, desc: "mục tiêu còn bị Choáng 1 vòng, rồi Hỏa Cuồng được tiêu hao",
  extra: ({ unit, target }) => [status(target, "stun", 1), setStackFx(unit, "annie_stun", 0)] };

export default defineHero({
  id: "annie", name: "Annie", role: "mage", armor: 20, mr: 30,
  atk: 50, ap: 95, hp: 560,
  desc: "Đứa trẻ bóng tối. Cứ 4 chiêu thì chiêu kế tiếp làm choáng, gọi gấu Tibbers đốt cả lane.",
  strength: "Dồn phép nhanh, choáng có thể tính trước",
  concept: "Hỏa Cuồng: đếm chiêu để canh choáng đúng lúc",
  passive: { name: "Hỏa Cuồng", desc: "Mỗi lần Annie tung chiêu, nhận 1 dấu; đủ 4 dấu thì **Hỏa Cuồng sẵn sàng**: chiêu gây sát thương kế tiếp của Annie làm mục tiêu bị Choáng 1 vòng." },
  props: [
    { name: "Hỏa Cuồng", desc: "Tung chiêu: +1 dấu, đủ 4 thì Hỏa Cuồng sẵn sàng.",
      onCast: (c) => (stackOf(c.self, "annie_pyro") + 1 >= 4
        ? [setStackFx(c.self, "annie_pyro", 0), setStackFx(c.self, "annie_stun", 1)]
        : [stackFx(c.self, "annie_pyro", 1)]) },
    { name: "Tibbers", desc: "Khi Cường Hoá (Tibbers): đầu lượt đốt cả lane 30 + 20% AP.", condition: C.selfHas("empower"),
      onTurnStart: (c) => (c.state ? laneEnemies(c.state, other(c.self.owner), c.self.lane).map((x) => hit(x, scaled(c.self, x, "magic", 30, 0, 0.2), "Tibbers")) : []) },
  ],
  skills: [
    {
      def: { id: "annie_q", key: "Q", name: "Hỏa Cầu", mana: 15, cooldown: 1, target: "enemyAny",
        desc: "Chọn 1 tướng địch cùng đường. Gây **{60 + 70% AP} sát thương phép** cho tướng đó." },
      targets: ({ state, unit }) => enemyIdsInLane(state, unit),
      boosts: [pyro, { condition: C.targetHpBelow(0.3), desc: "Annie được hoàn 15 mana", extra: ({ unit }) => [{ type: "heroMana", unitId: unit.id, amount: 15 }] }],
      resolve: ({ state, unit, targetId }) => {
        const t = targetOf(state, targetId);
        return t ? [hit(t, scaled(unit, t, "magic", 60, 0, 0.7), "Hỏa Cầu")] : [];
      },
    },
    {
      def: { id: "annie_w", key: "W", name: "Thiêu Cháy", mana: 25, cooldown: 2, target: "none",
        desc: "Gây {50 + 60% AP} sát thương phép cho **mọi tướng địch cùng đường**." },
      boosts: [pyro, { condition: C.laneEnemiesAtLeast(2), desc: "gây thêm 20% sát thương", mult: 1.2 }],
      resolve: ({ state, unit }) => laneEnemies(state, other(unit.owner), unit.lane).map((x) => hit(x, scaled(unit, x, "magic", 50, 0, 0.6), "Thiêu Rụi")),
    },
    {
      def: { id: "annie_e", key: "E", name: "Khiên Lửa", mana: 15, cooldown: 2, target: "allyLane",
        desc: "Chọn 1 tướng mình cùng đường. Tướng đó nhận Khiên {60 + 40% AP}; nếu tướng đó dưới 50% máu, Khiên **tăng thêm 50%**." },
      resolve: ({ state, unit, targetId }) => {
        const t = targetOf(state, targetId);
        return t ? [shieldFx(t, (60 + 0.4 * apOf(unit)) * lowHpBonus(t, 1.5))] : [];
      },
    },
    {
      def: { id: "annie_r", key: "R", name: "Triệu Hồi: Tibbers", mana: 70, cooldown: 5, target: "none",
        desc: "Gây {150 + 80% AP} sát thương phép cho mọi tướng địch cùng đường, rồi Annie nhận Cường Hoá trong 3 vòng. Khi đang Cường Hoá, đầu mỗi lượt **Tibbers** gây {30 + 20% AP} sát thương phép cho mọi tướng địch cùng đường." },
      boosts: [pyro, { condition: C.targetControlled, desc: "gây thêm 20% sát thương lên tướng đó", mult: 1.2 }],
      resolve: ({ state, unit }) => [
        ...laneEnemies(state, other(unit.owner), unit.lane).map((x) => hit(x, scaled(unit, x, "magic", 150, 0, 0.8), "Triệu Hồi Tibbers")),
        status(unit, "empower", 3)],
    },
  ],
});
