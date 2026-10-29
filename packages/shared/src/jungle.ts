// QUÁI RỪNG: hàng giữa bàn đấu (giữa 2 nửa sân), mỗi đường 1 bãi quái.
// Tướng đứng đủ gần thì dùng đòn đánh thường của lượt để đánh quái; quái đánh trả kẻ vừa đánh nó.
// Ai ra đòn kết liễu thì nhận thưởng. Riêng Baron: phe gây nhiều sát thương hơn nhận bùa, trừ khi bị Trừng Phạt cướp.
import {
    rowIndex
} from "./cards"
import {
    defineBuff
} from "./deck/registry"
import type {
    StateLike, UnitLike
} from "./types"

export type MonsterId = "red" | "wolves" | "baron" | "raptors" | "blue";
export interface MonsterDef {
  id: MonsterId; lane: number; name: string; hp: number;
  /** Sát thương quái đánh trả kẻ vừa đánh nó */
  retaliate: number;
  /** Số vòng hồi sinh sau khi bị hạ */
  respawn: number;
  /** Vòng xuất hiện lần đầu */
  firstRound: number;
}

export const JUNGLE: MonsterDef[] = [
    {
        id: "red", lane: 0, name: "Bùa Đỏ", hp: 900, retaliate: 60, respawn: 5, firstRound: 2
    },
    {
        id: "wolves", lane: 1, name: "Bầy Sói", hp: 500, retaliate: 40, respawn: 3, firstRound: 1
    },
    {
        id: "baron", lane: 2, name: "Baron Nashor", hp: 2500, retaliate: 150, respawn: 8, firstRound: 6
    },
    {
        id: "raptors", lane: 3, name: "Chim Đỏ", hp: 500, retaliate: 40, respawn: 3, firstRound: 1
    },
    {
        id: "blue", lane: 4, name: "Bùa Xanh", hp: 900, retaliate: 60, respawn: 5, firstRound: 2
    },
]
export const monsterAt = (lane: number) => JUNGLE.find((m) => m.lane === lane)

/** Trừng Phạt: sát thương chuẩn lên quái, dùng lại sau SMITE_COOLDOWN vòng */
export const SMITE_DAMAGE = 600, SMITE_COOLDOWN = 3, SMITE_RANGE = 2
/** Vàng khi hạ bãi quái nhỏ / Baron */
export const CAMP_GOLD = 3, BARON_GOLD = 5
/** Số vòng bùa Đỏ / Xanh / Baron */
export const BUFF_ROUNDS = 3, BARON_ROUNDS = 4

/** Khoảng cách từ tướng tới bãi quái: số hàng tới mép sân + 1 ô hàng rừng + lệch đường */
export const monsterDistance = (u: { row: string; lane: number }, lane: number) => rowIndex(u.row) + 1 + Math.abs(u.lane - lane)

export interface MonsterLike { lane: number; hp: number; maxHp: number; respawnRound: number }
export const monsterAlive = (m?: MonsterLike) => !!m && m.respawnRound === 0 && m.hp > 0

/** Bùa từ quái rừng (chạy như buff có hạn của lá bài) */
defineBuff({
    id: "red_buff", name: "Bùa Đỏ", short: "Bùa đỏ", desc: "+20% AD, hút máu 10%.",
    props: [{
        name: "Bùa Đỏ", desc: "+20% AD, hút máu 10%.", stats: {
            atkMult: 0.2, lifesteal: 0.1
        }
    }]
})
defineBuff({
    id: "blue_buff", name: "Bùa Xanh", short: "Bùa xanh", desc: "+30 AP, +10 Mana mỗi lượt.",
    props: [{
        name: "Bùa Xanh", desc: "+30 AP, +10 Mana mỗi lượt.", stats: {
            ap: 30, manaRegen: 10
        }
    }]
})

/** Đường có quái mà tướng `u` đánh tới được bằng đòn đánh thường (tầm theo vai trò) */
export function monsterTargets(state: StateLike & { monsters?: ArrayLike<MonsterLike> }, u: UnitLike, range: number): number[] {
    const out: number[] = []
    if (u.lane < 0 || !state.monsters) return out
    for (let i = 0; i < state.monsters.length; i++) {
        const m = state.monsters[i]
        if (monsterAlive(m) && monsterDistance(u,
            m.lane) <= range) out.push(m.lane)
    }
    return out
}
