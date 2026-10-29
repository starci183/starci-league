// Kiểm tra nhanh tauntZoneOf: tướng phe B đứng trong vùng Tibbers (của A, đặt trên nửa sân B) bị khiêu khích.
import { tauntZoneOf, type UnitLike } from "@starci/shared";
const z = { id: "z1", key: "tibbers", owner: "A", defId: "annie", srcId: "u1", side: "B", lane: 2, row: 0, shape: "3x3", turns: 2, hp: 100 };
const st = { turn: 9, activeSide: "B", units: new Map(), zones: [z] } as never;
const at = (lane: number, row: string, owner = "B") => ({ lane, row, owner } as unknown as UnitLike);
console.log("trong vùng:", !!tauntZoneOf(st, at(3, "mid")), "| ngoài vùng:", !!tauntZoneOf(st, at(4, "back")), "| phe A:", !!tauntZoneOf(st, at(2, "front", "A")));
