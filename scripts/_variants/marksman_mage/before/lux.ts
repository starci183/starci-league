// Lux: pháp sư ánh sáng. Chiêu để lại dấu Soi Rọi, đòn đánh và R kích nổ dấu.
import { apOf, hit, laneEnemies, other, scaled, status } from "../helpers";
import * as C from "../items/conditions";
import { defineHero } from "../registry";
import type { Effect, UnitLike } from "../types";
import { enemyIdsInLane, lowHpBonus, setStackFx, shieldFx, targetOf } from "./kit";

const mark = (t: UnitLike): Effect => setStackFx(t, "lux_mark", 1);
const marked = C.targetStackAtLeast("lux_mark", 1, "mục tiêu bị Soi Rọi");

export default defineHero({
  id: "lux", name: "Lux", role: "mage", armor: 20, mr: 30,
  atk: 56, ap: 100, hp: 580,
  desc: "Pháp sư ánh sáng. Chiêu để lại dấu Soi Rọi, đòn đánh và Cầu Vồng kích nổ dấu.",
  strength: "Dọn lane bằng AP, R xuyên lane tới trụ",
  concept: "Soi Rọi: chiêu đánh dấu, đòn đánh kích nổ, combo chiêu  đánh",
  passive: { name: "Chớp Lửa Soi Rọi", desc: "Đòn đánh của Lux vào tướng bị **Soi Rọi** gây thêm {20 + 40% AP} sát thương phép, rồi **xoá dấu** Soi Rọi." },
  props: [
    { name: "Chớp Lửa Soi Rọi", desc: "Đòn đánh vào mục tiêu bị Soi Rọi nổ thêm 20 + 40% AP (phép).", condition: marked,
      onAttack: (c) => (c.target ? [hit(c.target, scaled(c.self, c.target, "magic", 20, 0, 0.4), "Chớp Lửa Soi Rọi"), setStackFx(c.target, "lux_mark", 0)] : []) },
  ],
  skills: [
    {
      def: { id: "lux_q", key: "Q", name: "Khóa Ánh Sáng", mana: 25, cooldown: 3, target: "enemyAny", desc: "Chọn 1 tướng địch cùng đường. Gây {50 + 60% AP} sát thương phép cho tướng đó và gây **Choáng** 1 vòng; mọi tướng địch khác cùng đường nhận {30 + 30% AP} sát thương phép. Tất cả bị **Soi Rọi**." },
      targets: ({ state, unit }) => enemyIdsInLane(state, unit),
      boosts: [{ condition: C.targetIsCarry, desc: "gây thêm 20% sát thương lên tướng đó", mult: 1.2 }],
      resolve: ({ state, unit, targetId }) => {
        const t = targetOf(state, targetId);
        if (!t) return [];
        const rest = laneEnemies(state, other(unit.owner), unit.lane).filter((x) => x.id !== t.id);
        return [hit(t, scaled(unit, t, "magic", 50, 0, 0.6), "Khóa Ánh Sáng"), status(t, "stun", 1), mark(t),
          ...rest.flatMap((x) => [hit(x, scaled(unit, x, "magic", 30, 0, 0.3), "Khóa Ánh Sáng"), mark(x)])];
      },
    },
    {
      def: { id: "lux_w", key: "W", name: "Lăng Kính Phòng Hộ", mana: 20, cooldown: 2, target: "allyLane", desc: "Chọn 1 tướng mình cùng đường. Tướng đó nhận {80 + 60% AP} **Khiên** (**×1.5** nếu tướng đó dưới 50% máu)." },
      resolve: ({ state, unit, targetId }) => {
        const t = targetOf(state, targetId);
        return t ? [shieldFx(t, (80 + 0.6 * apOf(unit)) * lowHpBonus(t, 1.5))] : [];
      },
    },
    {
      def: { id: "lux_e", key: "E", name: "Quả Cầu Ánh Sáng", mana: 30, cooldown: 2, target: "none", desc: "Gây {70 + 50% AP} sát thương phép cho **mọi tướng địch cùng đường**, gây Buốt 1 vòng và **Soi Rọi**." },
      boosts: [{ condition: C.targetHas("chill"), desc: "gây thêm 25% sát thương lên tướng đó", mult: 1.25 }],
      resolve: ({ state, unit }) =>
        laneEnemies(state, other(unit.owner), unit.lane).flatMap((x) => [hit(x, scaled(unit, x, "magic", 70, 0, 0.5), "Quả Cầu Ánh Sáng"), status(x, "chill", 1), mark(x)]),
    },
    {
      def: { id: "lux_r", key: "R", name: "Cầu Vồng Tối Thượng", mana: 60, cooldown: 3, target: "none", desc: "Gây {150 + 100% AP} sát thương phép cho **mọi tướng địch cùng đường**, và trụ địch đường này nhận {75 + 50% AP} sát thương." },
      boosts: [{ condition: marked, desc: "gây thêm 30% sát thương lên tướng đó", mult: 1.3 }],
      resolve: ({ state, unit }): Effect[] => {
        const e = other(unit.owner), raw = 150 + apOf(unit);
        return [
          ...laneEnemies(state, e, unit.lane).map((x) => hit(x, scaled(unit, x, "magic", 150, 0, 1), "Cầu Vồng Tối Thượng")),
          { type: "damage", target: { kind: "tower", side: e, lane: unit.lane }, amount: Math.round(raw * 0.5), label: "Cầu Vồng Tối Thượng" },
        ];
      },
    },
  ],
});
