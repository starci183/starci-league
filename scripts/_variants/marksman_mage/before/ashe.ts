// Ashe: xạ thủ ổn định, làm Buốt mọi thứ, lộ diện tướng ẩn, tên băng xuyên bản đồ.
import { frontMost, hasStatus, hit, other, scaled, status } from "../helpers";
import * as C from "../items/conditions";
import { defaultAttack } from "../rules";
import { defineHero } from "../registry";
import type { Effect } from "../types";
import { lanesAround, targetOf } from "./kit";

export default defineHero({
  id: "ashe", name: "Ashe", role: "marksman", armor: 20, mr: 20,
  atk: 75, ap: 10, hp: 550,
  desc: "Xạ thủ ổn định từ đầu trận. Mỗi mũi tên làm Buốt, Ưng Tiễn lộ diện tướng ẩn.",
  strength: "Sát thương đều tay ngay từ đầu trận, không cần nuôi",
  concept: "Áp lực toàn bản đồ + soi: lộ diện mọi tướng địch đang ẩn",
  passive: { name: "Băng Tiễn", desc: "Mỗi đòn đánh của Ashe gây **Buốt 2 vòng** lên mục tiêu." },
  props: [
    { name: "Băng Tiễn", desc: "Đòn đánh gây Buốt 2 vòng.", onAttack: (c) => (c.target ? [status(c.target, "chill", 2)] : []) },
    { name: "Ưng Nhãn", desc: "Sau Ưng Tiễn: +20% sát thương.", condition: C.selfHas("empower"), damageMult: () => 1.2 },
  ],

  // Chú Tâm: đòn đánh bắn thêm 2 mũi tên 35%; mục tiêu đang Buốt +20%
  attack({ state, unit, target }) {
    if (!hasStatus(unit, "focus")) return undefined;
    const fx = defaultAttack(state, unit, target);
    const main = fx.reduce((s, f) => (f.type === "damage" ? s + f.amount : s), 0);
    const t = target.kind === "unit" ? state.units.get(target.id) : undefined;
    const mult = t && hasStatus(t, "chill") ? 0.42 : 0.35;
    return [...fx, ...[0, 1].map((): Effect => ({ type: "damage", target, amount: Math.round(main * mult), label: "Chú Tâm Tiễn" }))];
  },

  skills: [
    {
      def: { id: "ashe_q", key: "Q", name: "Chú Tâm Tiễn", mana: 25, cooldown: 2, target: "none",
        desc: "Trong 1 vòng, mỗi đòn đánh của Ashe **bắn thêm 2 mũi tên**, mỗi mũi gây 35% sát thương của đòn đánh đó (42% nếu mục tiêu đang bị Buốt)." },
      resolve: ({ unit }) => [status(unit, "focus", 1)],
    },
    {
      def: { id: "ashe_w", key: "W", name: "Tán Xạ Tiễn", mana: 25, cooldown: 2, target: "none",
        desc: "Gây {30 + 70% AD} sát thương vật lý cho tướng đứng đầu đường bên địch ở **đường này và 2 đường kề**, và gây Buốt 2 vòng lên các tướng đó." },
      boosts: [{ condition: C.targetHas("chill"), desc: "gây thêm 30% sát thương lên tướng đó", mult: 1.3 }],
      resolve: ({ state, unit }) =>
        lanesAround(unit).map((l) => frontMost(state, other(unit.owner), l)).filter((x) => !!x)
          .flatMap((x) => [hit(x!, scaled(unit, x!, "physical", 30, 0.7), "Tán Xạ Tiễn"), status(x!, "chill", 2)]),
    },
    {
      def: { id: "ashe_e", key: "E", name: "Ưng Tiễn", mana: 15, cooldown: 3, target: "none",
        desc: "Lộ diện **mọi tướng địch đang ẩn**. Ashe nhận Cường Hoá trong 2 vòng; khi đang Cường Hoá, Ashe gây **thêm 20% sát thương**." },
      resolve: ({ unit }) => [{ type: "reveal", side: other(unit.owner) }, status(unit, "empower", 2)],
    },
    {
      def: { id: "ashe_r", key: "R", name: "Đại Băng Tiễn", mana: 50, cooldown: 4, target: "enemyAny",
        desc: "Chọn 1 tướng địch **bất kỳ trên sân**. Gây {100 + 80% AD + 50% AP} sát thương phép cho tướng đó và gây Choáng 1 vòng." },
      boosts: [{ condition: C.targetIsolated, desc: "tướng đó bị **Choáng 2 vòng**", extra: ({ target }) => [status(target, "stun", 2)] }],
      resolve: ({ state, unit, targetId }) => {
        const t = targetOf(state, targetId);
        return t ? [hit(t, scaled(unit, t, "magic", 100, 0.8, 0.5), "Đại Băng Tiễn"), status(t, "stun", 1)] : [];
      },
    },
  ],
});
