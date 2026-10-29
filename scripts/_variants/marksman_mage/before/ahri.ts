// Ahri: pháp sư hồ ly. Quả cầu đi-về xuyên lane, mê hoặc, phi hồ lướt ẩn.
import { hit, laneEnemies, other, scaled, status } from "../helpers";
import * as C from "../items/conditions";
import { defineHero } from "../registry";
import { enemyIdsAround, frontsAt, healFx, lanesAround, targetOf } from "./kit";

export default defineHero({
  id: "ahri", name: "Ahri", role: "mage", armor: 20, mr: 30,
  atk: 55, ap: 90, hp: 580,
  desc: "Hồ ly chín đuôi. Quả cầu đi-về, mê hoặc kẻ địch, phi hồ lướt ẩn.",
  strength: "Cơ động: với tới 3 lane, tự hồi máu khi hạ gục",
  concept: "Mê hoặc: kẻ bị khống chế nhận thêm 20% sát thương từ Ahri",
  passive: { name: "Hút Hồn", desc: "Khi Ahri hạ gục 1 tướng địch, Ahri **hồi {15% máu tối đa} máu**." },
  props: [
    { name: "Hút Tinh Hoa", desc: "Hạ gục: hồi 15% máu tối đa.", onKill: (c) => [healFx(c.self, c.self.maxHp * 0.15)] },
    { name: "Mê Hoặc", desc: "Mục tiêu đang bị khống chế nhận thêm 20% sát thương.", condition: C.targetControlled, damageMult: () => 1.2 },
    { name: "Phi Hồ", desc: "Khi Cường Hoá: chiêu +20%.", condition: C.selfHas("empower"), stats: { spellAmp: 0.2 } },
  ],
  skills: [
    {
      def: { id: "ahri_q", key: "Q", name: "Quả Cầu Ma Thuật", mana: 25, cooldown: 2, target: "none",
        desc: "Gây {60 + 50% AP} sát thương phép cho mọi tướng địch cùng đường; tướng đứng đầu đường bên địch nhận thêm **{30 + 20% AP} sát thương chuẩn**." },
      boosts: [{ condition: C.laneEnemiesAtLeast(2), desc: "gây thêm 15% sát thương", mult: 1.15 }],
      resolve: ({ state, unit }) => {
        const enemies = laneEnemies(state, other(unit.owner), unit.lane);
        return [...enemies.map((x) => hit(x, scaled(unit, x, "magic", 60, 0, 0.5), "Quả Cầu Ma Thuật")),
          ...enemies.slice(0, 1).map((x) => hit(x, scaled(unit, x, "true", 30, 0, 0.2), "Quả Cầu (quay về)"))];
      },
    },
    {
      def: { id: "ahri_w", key: "W", name: "Lửa Hồ Ly", mana: 20, cooldown: 2, target: "none",
        desc: "Gây {30 + 30% AP} sát thương phép cho tướng đứng đầu đường bên địch ở **đường này và 2 đường kề**." },
      boosts: [{ condition: C.targetControlled, desc: "gây thêm 50% sát thương lên tướng đó", mult: 1.5 }],
      resolve: ({ state, unit }) => frontsAt(state, unit, lanesAround(unit)).map((x) => hit(x, scaled(unit, x, "magic", 30, 0, 0.3), "Lửa Hồ Ly")),
    },
    {
      def: { id: "ahri_e", key: "E", name: "Hôn Gió", mana: 30, cooldown: 3, target: "enemyAny",
        desc: "Chọn 1 tướng địch ở đường này hoặc đường kề. Gây {60 + 60% AP} sát thương phép cho tướng đó và gây **Choáng 1 vòng**." },
      targets: ({ state, unit }) => enemyIdsAround(state, unit),
      boosts: [{ condition: C.targetRole("assassin", "fighter"), desc: "tướng đó bị Choáng 2 vòng", extra: ({ target }) => [status(target, "stun", 2)] }],
      resolve: ({ state, unit, targetId }) => {
        const t = targetOf(state, targetId);
        return t ? [hit(t, scaled(unit, t, "magic", 60, 0, 0.6), "Hôn Gió"), status(t, "stun", 1)] : [];
      },
    },
    {
      def: { id: "ahri_r", key: "R", name: "Phi Hồ", mana: 50, cooldown: 4, target: "none",
        desc: "Gây {40 + 35% AP} sát thương phép cho tướng đứng đầu đường bên địch ở đường này và 2 đường kề, rồi Ahri **ẩn thân** và nhận Cường Hoá trong 2 vòng. Khi đang Cường Hoá, chiêu của Ahri gây **thêm 20% sát thương**." },
      boosts: [{ condition: C.targetHpBelow(0.4), desc: "gây thêm 30% sát thương lên tướng đó", mult: 1.3 }],
      resolve: ({ state, unit }) => [
        ...frontsAt(state, unit, lanesAround(unit)).map((x) => hit(x, scaled(unit, x, "magic", 40, 0, 0.35), "Phi Hồ")),
        { type: "hide", unitId: unit.id }, status(unit, "empower", 2)],
    },
  ],
});
