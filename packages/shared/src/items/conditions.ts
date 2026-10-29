// Thư viện ICondition. Mỗi điều kiện có `kind` (để lưu/so sánh/hiển thị) và `desc`.
// Ghép tự do: all(a, b), any(a, b), not(a). NONE = luôn bật.
import type {
    Role, Row, StatusId
} from "../cards"
import {
    ROW_NAME, STATUS_INFO
} from "../cards"
import {
    adjacent, hasStatus, hpPct, isCarry, laneEnemies, other, roleOf, stackOf
} from "../helpers"
import type {
    UnitLike
} from "../types"
import type {
    ICondition, PropCtx
} from "./types"

const cond = (kind: string, desc: string, test: (c: PropCtx) => boolean): ICondition => ({
    kind, desc, test
})
const pct = (p: number) => `${Math.round(p * 100)}%`
const alliesInLane = (c: PropCtx) => {
    const out: UnitLike[] = []
    c.state?.units.forEach((u) => { if (u.owner === c.self.owner && u.lane === c.self.lane && u.id !== c.self.id) out.push(u) })
    return out
}

export const NONE: ICondition = cond("none",
    "luôn bật",
    () => true)

// ---- máu ----
export const targetHpBelow = (p: number) => cond("targetHpBelow",
    `mục tiêu dưới ${pct(p)} máu`,
    (c) => !!c.target && hpPct(c.target) < p)
export const targetHpAbove = (p: number) => cond("targetHpAbove",
    `mục tiêu trên ${pct(p)} máu`,
    (c) => !!c.target && hpPct(c.target) > p)
export const selfHpBelow = (p: number) => cond("selfHpBelow",
    `bản thân dưới ${pct(p)} máu`,
    (c) => hpPct(c.self) < p)
export const targetMaxHpHigher = cond("targetMaxHpHigher",
    "mục tiêu có máu tối đa cao hơn mình",
    (c) => !!c.target && c.target.maxHp > c.self.maxHp)
export const targetMaxHpAbove = (n: number) => cond("targetMaxHpAbove",
    `mục tiêu trên ${n} máu tối đa`,
    (c) => !!c.target && c.target.maxHp > n)
export const selfMaxHpAbove = (n: number) => cond("selfMaxHpAbove",
    `máu tối đa trên ${n}`,
    (c) => c.self.maxHp > n)
export const allyLaneHpBelow = (p: number) =>
    cond("allyLaneHpBelow",
        `đồng minh cùng lane dưới ${pct(p)} máu`,
        (c) => alliesInLane(c).some((u) => hpPct(u) < p))

// ---- loại tướng ----
const ROLE_VI: Record<Role, string> = {
    tank: "đỡ đòn", fighter: "đấu sĩ", assassin: "sát thủ", mage: "pháp sư", marksman: "xạ thủ", support: "trợ thủ"
}
export const targetRole = (...roles: Role[]) =>
    cond("targetRole",
        `mục tiêu là ${roles.map((r) => ROLE_VI[r]).join("/")}`,
        (c) => !!c.target && roles.includes(roleOf(c.target)))
export const targetIsCarry = cond("targetIsCarry",
    "mục tiêu là xạ thủ/pháp sư",
    (c) => !!c.target && isCarry(c.target))
export const sourceRole = (...roles: Role[]) =>
    cond("sourceRole",
        `kẻ đánh là ${roles.join("/")}`,
        (c) => !!c.source && roles.includes(roleOf(c.source)))

// ---- trạng thái ----
const names = (s: StatusId[]) => s.map((x) => STATUS_INFO[x].name).join("/")
export const targetHas = (...s: StatusId[]) =>
    cond("targetHas",
        `mục tiêu đang ${names(s)}`,
        (c) => !!c.target && s.some((x) => hasStatus(c.target!,
            x)))
export const selfHas = (...s: StatusId[]) => cond("selfHas",
    `bản thân đang ${names(s)}`,
    (c) => s.some((x) => hasStatus(c.self,
        x)))
export const targetControlled = targetHas("stun",
    "freeze")
export const targetHasShield = cond("targetHasShield",
    "mục tiêu đang có khiên",
    (c) => !!c.target && c.target.shield > 0)
export const allyLaneControlled = cond("allyLaneControlled",
    "đồng minh cùng lane bị choáng/đóng băng",
    (c) => alliesInLane(c).some((u) => hasStatus(u,
        "stun") || hasStatus(u,
        "freeze")))

// ---- vị trí ----
export const selfRow = (row: Row) => cond("selfRow",
    `đứng ${ROW_NAME[row]}`,
    (c) => c.self.row === row)
export const targetRow = (row: Row) => cond("targetRow",
    `mục tiêu ở ${ROW_NAME[row]}`,
    (c) => !!c.target && c.target.row === row)
export const targetOtherLane = cond("targetOtherLane",
    "mục tiêu ở lane khác",
    (c) => !!c.target && c.target.lane !== c.self.lane)
export const targetIsolated = cond("targetIsolated",
    "mục tiêu đứng một mình trong lane",
    (c) => {
        if (!c.target || !c.state) return false
        let n = 0
        c.state.units.forEach((u) => { if (u.owner === c.target!.owner && u.lane === c.target!.lane) n++ })
        return n === 1
    })
export const laneEnemiesAtLeast = (n: number) => cond("laneEnemiesAtLeast",
    `lane có từ ${n} tướng địch`,
    (c) =>
        !!c.state && laneEnemies(c.state,
            other(c.self.owner),
            c.self.lane).length >= n)

// ---- cơ chế vị trí: tường, đồng minh, địch đứng gần nhau ----
/** Đồng phe đứng ô kề (8 hướng) với `u` */
const neighbours = (c: PropCtx, u: UnitLike) => {
    const out: UnitLike[] = []
    c.state?.units.forEach((x) => { if (x.id !== u.id && x.lane >= 0 && !x.hidden && adjacent(x,
        u)) out.push(x) })
    return out
}
/** Tường = đường biên (sát quái rừng, đường 1 và 5) hoặc hàng cuối sân (hậu tuyến) */
const atWall = (u: UnitLike) => u.lane === 0 || u.lane === 4 || u.row === "back"
export const targetAtWall = cond("targetAtWall",
    "mục tiêu sát tường (đường biên hoặc hàng cuối)",
    (c) => !!c.target && atWall(c.target))
/** Góc = đường biên và hậu tuyến (kẹt hai mặt tường) */
export const targetInCorner = cond("targetInCorner",
    "mục tiêu ở góc (đường biên, hậu tuyến)",
    (c) => !!c.target && atWall(c.target) && c.target.row === "back")
export const selfAtWall = cond("selfAtWall",
    "bản thân sát tường (đường biên hoặc hàng cuối)",
    (c) => atWall(c.self))
/** Mình có ít nhất n đồng minh đứng ô kề */
export const alliesNearAtLeast = (n: number) => cond("alliesNearAtLeast",
    `có từ ${n} đồng minh đứng kề`,
    (c) => neighbours(c,
        c.self).length >= n)
export const selfAlone = cond("selfAlone",
    "không có đồng minh đứng kề",
    (c) => neighbours(c,
        c.self).length === 0)
/** Mục tiêu có đồng đội đứng kề (địch đứng dồn) */
export const targetNearAlly = cond("targetNearAlly",
    "mục tiêu có đồng đội đứng kề",
    (c) => !!c.target && neighbours(c,
        c.target).length > 0)
export const targetNoAllyNear = cond("targetNoAllyNear",
    "mục tiêu không có đồng đội đứng kề",
    (c) => !!c.target && neighbours(c,
        c.target).length === 0)
/** Ở 3 đường quanh mình có ít nhất n tướng địch */
export const enemiesAroundAtLeast = (n: number) => cond("enemiesAroundAtLeast",
    `3 đường quanh mình có từ ${n} tướng địch`,
    (c) => {
        if (!c.state) return false
        const e = other(c.self.owner)
        return [c.self.lane - 1,
            c.self.lane,
            c.self.lane + 1].filter((l) => l >= 0 && l < 5)
            .reduce((s, l) => s + laneEnemies(c.state!,
                e,
                l).length,
            0) >= n
    })
/** Mục tiêu và đồng đội của nó trong vùng 3×3 quanh nó đủ n tướng (địch đứng cụm) */
export const targetClusterAtLeast = (n: number) => cond("targetClusterAtLeast",
    `cụm 3×3 quanh mục tiêu có từ ${n} tướng địch`,
    (c) => !!c.target && neighbours(c,
        c.target).length + 1 >= n)
export const targetSameLane = cond("targetSameLane",
    "mục tiêu cùng đường",
    (c) => !!c.target && c.target.lane === c.self.lane)
export const selfMoved = cond("selfMoved",
    "vừa di chuyển lượt này",
    (c) => !!c.self.moved)
export const selfHasShield = cond("selfHasShield",
    "bản thân đang có khiên",
    (c) => c.self.shield > 0)
export const targetFullHp = cond("targetFullHp",
    "mục tiêu còn đầy máu",
    (c) => !!c.target && c.target.hp >= c.target.maxHp)
/** Trận đã sang vòng n (mỗi vòng = 2 lượt) */
export const roundAtLeast = (n: number) => cond("roundAtLeast",
    `từ vòng ${n}`,
    (c) => !!c.state && Math.ceil(c.state.turn / 2) >= n)
export const selfHpAbove = (p: number) => cond("selfHpAbove",
    `bản thân trên ${pct(p)} máu`,
    (c) => hpPct(c.self) > p)

// ---- nhịp trận / cộng dồn ----
export const castThisTurn = cond("castThisTurn",
    "đã tung chiêu lượt này",
    (c) => c.self.castThisTurn)
export const isSkill = cond("isSkill",
    "là sát thương chiêu",
    (c) => !!c.isSkill)
export const isAttack = cond("isAttack",
    "là đòn đánh thường",
    (c) => !!c.isAttack)
export const stacksAtLeast = (key: string, n: number, label: string) => cond("stacksAtLeast",
    label,
    (c) => stackOf(c.self,
        key) >= n)
export const targetStackAtLeast = (key: string, n: number, label: string) =>
    cond("targetStackAtLeast",
        label,
        (c) => !!c.target && stackOf(c.target,
            key) >= n)
export const flagOn = (key: string, label: string) => cond("flagOn",
    label,
    (c) => stackOf(c.self,
        key) > 0)

// ---- ghép ----
export const all = (...cs: ICondition[]) => cond("all",
    cs.map((x) => x.desc).join(" và "),
    (c) => cs.every((x) => x.test(c)))
export const any = (...cs: ICondition[]) => cond("any",
    cs.map((x) => x.desc).join(" hoặc "),
    (c) => cs.some((x) => x.test(c)))
export const not = (x: ICondition) => cond("not",
    `không phải: ${x.desc}`,
    (c) => !x.test(c))
