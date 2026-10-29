// Lissandra: phù thủy băng. Đóng băng, Buốt, và tự phong ấn mình khi nguy kịch.
import { frontMost, hit, laneEnemies, other, scaled, status } from "../helpers";
import * as C from "../items/conditions";
import { defineHero } from "../registry";
import { enemyIdsInLane, healFx, lanesAround, targetOf } from "./kit";

export default defineHero({
  id: "lissandra", name: "Lissandra", role: "mage", armor: 20, mr: 30,
  atk: 60, ap: 85, hp: 620,
  desc: "Phù thủy băng. Đóng băng kẻ địch; kẻ bị Buốt nhận thêm 25% sát thương từ mọi nguồn.",
  strength: "Khống chế diện rộng: đóng băng cả lane",
  concept: "Buốt: đóng băng xong cả đội dồn sát thương; tự phong ấn khi sắp chết",
  passive: { name: "Uy Quyền Băng Tộc", desc: "Lissandra gây **thêm 30% sát thương** lên tướng đang bị **Buốt**." },
  props: [{ name: "Uy Quyền Băng Tộc", desc: "Sát thương lên mục tiêu đang Buốt +30%.", condition: C.targetHas("chill"), damageMult: () => 1.3 }],
  skills: [
    {
      def: { id: "lissandra_q", key: "Q", name: "Mảnh Băng", mana: 20, cooldown: 2, target: "none", desc: "Tướng đứng đầu đường bên địch nhận {60 + 60% AP} sát thương phép và bị **Buốt** 2 vòng; tướng đứng ngay sau nhận {30 + 30% AP} sát thương phép." },
      boosts: [{ condition: C.targetHas("chill"), desc: "gây thêm 25% sát thương lên tướng đó", mult: 1.25 }],
      resolve: ({ state, unit }) => {
        const [first, second] = laneEnemies(state, other(unit.owner), unit.lane);
        const fx = first ? [hit(first, scaled(unit, first, "magic", 60, 0, 0.6), "Mảnh Băng"), status(first, "chill", 2)] : [];
        if (second) fx.push(hit(second, scaled(unit, second, "magic", 30, 0, 0.3), "Mảnh Băng"));
        return fx;
      },
    },
    {
      def: { id: "lissandra_w", key: "W", name: "Vòng Tròn Lạnh Giá", mana: 30, cooldown: 3, target: "none", desc: "Gây {30 + 30% AP} sát thương phép cho **mọi tướng địch cùng đường** và gây **Đóng băng** 1 vòng." },
      boosts: [{ condition: C.laneEnemiesAtLeast(2), desc: "gây thêm 20% sát thương", mult: 1.2 }],
      resolve: ({ state, unit }) =>
        laneEnemies(state, other(unit.owner), unit.lane).flatMap((x) => [hit(x, scaled(unit, x, "magic", 30, 0, 0.3), "Vòng Tròn Lạnh Giá"), status(x, "freeze", 1)]),
    },
    {
      def: { id: "lissandra_e", key: "E", name: "Con Đường Băng Giá", mana: 20, cooldown: 3, target: "none", desc: "Tướng địch đứng đầu **3 đường** (đường này và 2 đường kề) nhận {40 + 40% AP} sát thương phép và bị **Buốt** 2 vòng." },
      boosts: [{ condition: C.targetRole("tank"), desc: "gây thêm 30% sát thương lên tướng đó", mult: 1.3 }],
      resolve: ({ state, unit }) =>
        lanesAround(unit).map((l) => frontMost(state, other(unit.owner), l)).filter((x) => !!x)
          .flatMap((x) => [hit(x!, scaled(unit, x!, "magic", 40, 0, 0.4), "Con Đường Băng Giá"), status(x!, "chill", 2)]),
    },
    {
      def: { id: "lissandra_r", key: "R", name: "Hầm Mộ Hàn Băng", mana: 50, cooldown: 4, target: "enemyAny", desc: "Chọn 1 tướng địch cùng đường. Gây {100 + 80% AP} sát thương phép cho tướng đó, gây **Đóng băng** 1 vòng và Buốt 2 vòng." },
      targets: ({ state, unit }) => enemyIdsInLane(state, unit),
      boosts: [{ condition: C.selfHpBelow(0.35), desc: "Lissandra **tự phong ấn**: Bất Tử 1 vòng và hồi {30% máu tối đa} máu",
        extra: ({ unit }) => [status(unit, "invuln", 1), healFx(unit, unit.maxHp * 0.3)] }],
      resolve: ({ state, unit, targetId }) => {
        const t = targetOf(state, targetId);
        return t ? [hit(t, scaled(unit, t, "magic", 100, 0, 0.8), "Hầm Mộ Hàn Băng"), status(t, "freeze", 1), status(t, "chill", 2)] : [];
      },
    },
  ],
});
