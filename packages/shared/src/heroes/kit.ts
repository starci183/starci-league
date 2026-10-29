// Đồ nghề chung để viết chiêu tướng.
import {
    frontMost, isWallCell, laneEnemies, other, unitAt, unitsInArea, visible
} from "../helpers"
import {
    ROWS, rowIndex
} from "../cards"
import type {
    Effect, StateLike, UnitLike
} from "../types"

export const lanesAround = (u: UnitLike) => [u.lane - 1,
    u.lane,
    u.lane + 1].filter((l) => l >= 0 && l < 5)
/** Id tướng địch nhìn thấy được ở lane mình (hoặc 3 lane quanh mình) */
export const enemyIdsInLane = (state: StateLike, u: UnitLike) => laneEnemies(state,
    other(u.owner),
    u.lane).map((x) => x.id)
export const enemyIdsAround = (state: StateLike, u: UnitLike) =>
    lanesAround(u).flatMap((l) => laneEnemies(state,
        other(u.owner),
        l)).map((x) => x.id)
/** Tướng địch đứng sau cùng trong lane (hậu tuyến, không có thì hàng giữa) */
export const backRowEnemy = (state: StateLike, u: UnitLike) =>
    visible(unitAt(state,
        other(u.owner),
        u.lane,
        "back")) ?? visible(unitAt(state,
        other(u.owner),
        u.lane,
        "mid"))
export function alliesInLane(state: StateLike, u: UnitLike) {
    const out: UnitLike[] = []
    state.units.forEach((x) => { if (x.owner === u.owner && x.lane === u.lane) out.push(x) })
    return out
}
/** Mọi đồng minh đang trên sân (toàn bản đồ) */
export function alliesOnBoard(state: StateLike, u: UnitLike) {
    const out: UnitLike[] = []
    state.units.forEach((x) => { if (x.owner === u.owner && x.lane >= 0) out.push(x) })
    return out
}
/** Tướng địch đứng đầu ở các lane cho trước */
export const frontsAt = (state: StateLike, u: UnitLike, lanes: number[]) =>
    lanes.filter((l) => l >= 0 && l < 5).map((l) => frontMost(state,
        other(u.owner),
        l)).filter((x): x is UnitLike => !!x)
export const targetOf = (state: StateLike, id?: string) => (id ? state.units.get(id) : undefined)
/** Sát thương chính của đòn vừa tính lên mục tiêu */
export const mainDamageOf = (effects: Effect[] | undefined, target?: UnitLike) =>
    (effects ?? []).reduce((s, f) => (f.type === "damage" && f.target.kind === "unit" && f.target.id === target?.id ? s + f.amount : s),
        0)
export const stackFx = (u: UnitLike, key: string, add: number, max?: number): Effect => ({
    type: "stack", unitId: u.id, key, add, max
})
export const setStackFx = (u: UnitLike, key: string, value: number): Effect => ({
    type: "stack", unitId: u.id, key, set: value
})
export const shieldFx = (u: UnitLike, n: number): Effect => ({
    type: "shield", unitId: u.id, amount: Math.round(n)
})
export const healFx = (u: UnitLike, n: number): Effect => ({
    type: "heal", unitId: u.id, amount: Math.round(n)
})
/** Khiên/hồi máu mạnh hơn lên đồng minh máu thấp */
export const lowHpBonus = (u: UnitLike, mult: number) => (u.hp < u.maxHp * 0.5 ? mult : 1)

// ---- dời chỗ: đẩy lùi, kéo lên, hất sang đường bên ----
/** dRow +1 = đẩy lùi, −1 = kéo lên; dLane ±1 = hất sang bên */
export const displaceFx = (u: UnitLike, dRow = 0, dLane = 0): Effect => ({
    type: "displace", unitId: u.id, dRow, dLane
})
/** Dời `u` có bị chặn không (ra ngoài bàn = va tường, hoặc ô đích có người = va đồng đội) */
export function pushBlocked(state: StateLike, u: UnitLike, dRow = 0, dLane = 0) {
    const ri = rowIndex(u.row) + dRow, lane = u.lane + dLane
    if (ri < 0 || ri >= ROWS.length || lane < 0 || lane >= 5) return true
    // Tường Băng (Lissandra) cũng là tường: dời vào thì va
    return !!unitAt(state,
        u.owner,
        lane,
        ROWS[ri]) || isWallCell(state,
        u.owner,
        lane,
        ri)
}
/** Hướng hất sang bên ra phía tường gần nhất (đường 1-2 hất về trái, 4-5 về phải, giữa: về trái) */
export const wallward = (u: UnitLike) => (u.lane >= 3 ? 1 : -1)
/** Đồng đội của `u` đứng ô kề (8 hướng) */
export function neighboursOf(state: StateLike, u: UnitLike) {
    const out: UnitLike[] = []
    state.units.forEach((x) => {
        if (x.id === u.id || x.lane < 0 || x.owner !== u.owner || x.hidden) return
        if (Math.max(Math.abs(x.lane - u.lane),
            Math.abs(rowIndex(x.row) - rowIndex(u.row))) === 1) out.push(x)
    })
    return out
}

// ---- vùng chiêu: 1×1, 2×2, 3×3, thập tự, hàng ngang, cột dọc, 3 ô trước mặt (định nghĩa ở helpers) ----
export { areaCells, unitsInArea } from "../helpers"
export type { AreaShape } from "../cards"
/** Tướng địch trong vùng đặt tâm ở tướng `target` (vd. chọn 1 địch, nổ 3×3 quanh nó) */
export const enemiesAroundTarget = (state: StateLike, target: UnitLike, shape: import("../cards").AreaShape) =>
    unitsInArea(state,
        target.owner,
        shape,
        {
            lane: target.lane, row: rowIndex(target.row)
        })
/** 3 ô trước mặt người dùng chiêu: tiền tuyến địch ở đường mình và 2 đường kề */
export const enemiesFront3 = (state: StateLike, u: UnitLike) => unitsInArea(state,
    other(u.owner),
    "front3",
    {
        lane: u.lane, row: 0
    })
