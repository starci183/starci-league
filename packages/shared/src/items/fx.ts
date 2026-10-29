// Hàm tạo hiệu ứng ngắn gọn cho các món đồ.
import type {
    StatusId
} from "../cards"
import {
    frontMost, laneEnemies, other
} from "../helpers"
import type {
    Effect, StateLike, UnitLike
} from "../types"

export const shield = (u: UnitLike, n: number): Effect => ({
    type: "shield", unitId: u.id, amount: Math.round(n)
})
export const heal = (u: UnitLike, n: number): Effect => ({
    type: "heal", unitId: u.id, amount: Math.round(n)
})
export const status = (u: UnitLike, s: StatusId, turns: number): Effect => ({
    type: "status", unitId: u.id, status: s, turns
})
export const burn = (u: UnitLike, amount: number, turns = 2): Effect => ({
    type: "burn", unitId: u.id, amount: Math.round(amount), turns
})
export const dmg = (u: UnitLike, amount: number, label: string): Effect =>
    ({
        type: "damage", target: {
            kind: "unit", id: u.id
        }, amount: Math.round(amount), label, tag: "item"
    })
export const stack = (u: UnitLike, key: string, add: number, max?: number): Effect => ({
    type: "stack", unitId: u.id, key, add, max
})
export const setFlag = (u: UnitLike, key: string, value = 1): Effect => ({
    type: "stack", unitId: u.id, key, set: value
})
/** Cộng chỉ số vĩnh viễn: atk/hp/manaDiscount là số nguyên, các chỉ số % tính bằng phần trăm nguyên */
export const bonus = (u: UnitLike, stat: string, add: number, max?: number) => stack(u,
    `bonus:${stat}`,
    add,
    max)

export const enemiesInLane = (state: StateLike, u: UnitLike) => laneEnemies(state,
    other(u.owner),
    u.lane)
export function alliesInLane(state: StateLike, u: UnitLike, includeSelf = true) {
    const out: UnitLike[] = []
    state.units.forEach((x) => { if (x.owner === u.owner && x.lane === u.lane && (includeSelf || x.id !== u.id)) out.push(x) })
    return out
}
export const frontOfLanes = (state: StateLike, u: UnitLike, lanes: number[]) =>
    lanes.filter((l) => l >= 0 && l < 5).map((l) => frontMost(state,
        other(u.owner),
        l)).filter((x): x is UnitLike => !!x)
/** Sát thương chính của đòn vừa đánh lên mục tiêu */
export const mainDamage = (effects: Effect[] | undefined, target?: UnitLike) =>
    (effects ?? []).reduce((s, f) => (f.type === "damage" && f.target.kind === "unit" && f.target.id === target?.id ? s + f.amount : s),
        0)
/** Id tướng dạng số để lưu vào bộ đếm (u12 -> 12) */
export const unitNum = (u: UnitLike) => Number(u.id.replace(/\D/g,
    "")) || 0
