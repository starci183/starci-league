// Kog'Maw: xạ thủ siêu late. Bắn tank tích Kog stack, Kog stack làm W càng về sau càng đau.
import { apOf, atkOf, hasStatus, hit, laneEnemies, mixed, other, roleOf, stackOf, status } from "../helpers";
import * as C from "../items/conditions";
import { defaultAttack } from "../rules";
import { defineHero } from "../registry";
import type { Target } from "../types";
import { enemyIdsInLane, lanesAround, stackFx, targetOf } from "./kit";

export default defineHero({
  id: "kogmaw", name: "Kog'Maw", role: "marksman", armor: 25, mr: 25,
  atk: 65, ap: 40, hp: 720,
  desc: "Xạ thủ siêu late. Bắn tank để tích Kog stack, W càng về sau càng đau.",
  strength: "Lên đồ tốc đánh: W xay tank theo % máu. Lên AP: R thành pháo cao xạ bắn cả bản đồ",
  counter: "Đỡ đòn: W ăn 3% máu tối đa mục tiêu và tích Kog stack, Q rã giáp",
  passive: { name: "Bất Ngờ Từ Icathia", desc: "Khi Kog'Maw chết: gây {100 + 30% AD + 50% AP} **Sát thương chuẩn** cho mọi tướng địch cùng đường." },

  onDeath: ({ state, unit }) =>
    laneEnemies(state, other(unit.owner), unit.lane).map((x) => hit(x, 100 + 0.3 * atkOf(unit) + 0.5 * apOf(unit), "Bất Ngờ Từ Icathia", "true")),

  // W đang bật: mỗi đòn thêm (10 + 15% AD) vật lý + (15% AP + 3% máu tối đa mục tiêu + 2 × Kog stack) phép; bắn tank +1 Kog stack
  attack({ state, unit, target }) {
    if (!hasStatus(unit, "barrage")) return undefined;
    const fx = defaultAttack(state, unit, target);
    const t = target.kind === "unit" ? state.units.get(target.id) : undefined;
    if (t) {
      fx.push(...mixed(unit, t, "Cao Xạ Ma Pháp", {
        physical: 10 + 0.15 * atkOf(unit),
        magic: 0.15 * apOf(unit) + 0.03 * t.maxHp + 2 * stackOf(unit, "kog"),
      }));
      if (roleOf(t) === "tank") fx.push(stackFx(unit, "kog", 1));
    }
    return fx;
  },
  extraTargets({ state, unit }) {
    if (!hasStatus(unit, "barrage")) return [];
    return lanesAround(unit).flatMap((l) => laneEnemies(state, other(unit.owner), l)).map((x): Target => ({ kind: "unit", id: x.id }));
  },

  skills: [
    {
      def: { id: "kogmaw_q", key: "Q", name: "Phun Axít", mana: 20, cooldown: 2, target: "enemyAny", desc: "Chọn 1 tướng địch cùng đường. Gây {40 + 80% AD} sát thương vật lý và {40% AP} sát thương phép cho tướng đó và gây **Rã giáp** 2 vòng." },
      targets: ({ state, unit }) => enemyIdsInLane(state, unit),
      boosts: [{ condition: C.targetHas("shred", "chill"), desc: "gây thêm 25% sát thương", mult: 1.25 }],
      resolve: ({ state, unit, targetId }) => {
        const t = targetOf(state, targetId);
        return t ? [...mixed(unit, t, "Phun Axít", { physical: 40 + 0.8 * atkOf(unit), magic: 0.4 * apOf(unit) }), status(t, "shred", 2)] : [];
      },
    },
    {
      def: { id: "kogmaw_w", key: "W", name: "Cao Xạ Ma Pháp", mana: 30, cooldown: 3, target: "none",
        desc: "Trong 2 vòng, đòn đánh của Kog'Maw **với tới mọi tướng địch ở 3 đường quanh mình** và gây thêm {10 + 15% AD} sát thương vật lý cùng {15% AP} + **3% máu tối đa của mục tiêu** + 2 × số Kog stack sát thương phép. Đánh tướng đỡ đòn: Kog'Maw nhận **+1 Kog stack** (vĩnh viễn)." },
      resolve: ({ unit }) => [status(unit, "barrage", 2)],
    },
    {
      def: { id: "kogmaw_e", key: "E", name: "Dung Dịch Hư Không", mana: 25, cooldown: 2, target: "none", desc: "Gây {20% AD} sát thương vật lý và {60 + 60% AP} sát thương phép cho **mọi tướng địch cùng đường** và gây **Buốt** 2 vòng." },
      boosts: [{ condition: C.laneEnemiesAtLeast(2), desc: "gây thêm 20% sát thương", mult: 1.2 }],
      resolve: ({ state, unit }) =>
        laneEnemies(state, other(unit.owner), unit.lane).flatMap((x) => [...mixed(unit, x, "Dung Dịch Hư Không", { physical: 0.2 * atkOf(unit), magic: 60 + 0.6 * apOf(unit) }), status(x, "chill", 2)]),
    },
    {
      def: { id: "kogmaw_r", key: "R", name: "Pháo Sinh Học", mana: 50, cooldown: 1, target: "enemyAny", desc: "Chọn 1 tướng địch **bất kỳ trên bản đồ**. Gây {50% AD} sát thương vật lý và {80 + 70% AP} sát thương phép cho tướng đó." },
      boosts: [
        { condition: C.targetHpBelow(0.4), desc: "gây **gấp đôi sát thương**", mult: 2 },
        { condition: C.targetRole("tank"), desc: "Kog'Maw nhận +1 Kog stack", extra: ({ unit }) => [stackFx(unit, "kog", 1)] },
      ],
      resolve: ({ state, unit, targetId }) => {
        const t = targetOf(state, targetId);
        return t ? mixed(unit, t, "Pháo Sinh Học", { physical: 0.5 * atkOf(unit), magic: 80 + 0.7 * apOf(unit) }) : [];
      },
    },
  ],
});
