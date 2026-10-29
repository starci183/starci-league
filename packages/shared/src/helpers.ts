// Hàm tiện ích cho luật và cho các adapter tướng.
import {
    AreaShape, HeroCard, ROLE_INFO, ROWS, Role, STATUS_INFO, Side, StatusId, rowIndex
} from "./cards"
import {
    CARDS
} from "./registry"
import {
    heroDamageKind
} from "./damageTypes"
import type {
    DamageKind, Effect, StateLike, UnitLike
} from "./types"
import {
    statsOf
} from "./items/stats"

export const other = (s: string): Side => (s === "A" ? "B" : "A")
export const heroOf = (u: UnitLike) => CARDS[u.defId] as HeroCard
export const roleOf = (u: UnitLike): Role => heroOf(u).role
/** AD gồm cả đồ: (gốc + cộng thêm) × (1 + % AD) */
export const atkOf = (u: UnitLike) => {
    const st = statsOf(u)
    return Math.round((heroOf(u).atk + u.atkBonus + st.atk) * (1 + st.atkMult))
}
/** AP = gốc + đồ */
export const apOf = (u: UnitLike) => Math.round(heroOf(u).ap + statsOf(u).ap)
/** Sát thương theo công thức base + %AD + %AP, áp giáp/giáp phép (có sát lực/xuyên phép của người ra đòn) */
export const scaled = (u: UnitLike, target: UnitLike, kind: "physical" | "magic" | "true", base: number, ad = 0, ap = 0) => {
    const raw = base + ad * atkOf(u) + ap * apOf(u)
    return kind === "physical" ? physical(raw,
        target,
        u) : kind === "magic" ? magic(raw,
        target,
        u) : Math.round(raw)
}
export const isCarry = (u: UnitLike) => roleOf(u) === "marksman" || roleOf(u) === "mage"
/** Ẩn thì không chọn làm mục tiêu được */
export const visible = (u?: UnitLike) => (u && !u.hidden ? u : undefined)
/** Giáp / giáp phép dạng số phẳng (Rã giáp −40%) */
const shredMult = (u: UnitLike) => (hasStatus(u,
    "shred") ? 0.6 : 1)
export const armorOf = (u: UnitLike) => Math.round((heroOf(u).armor + statsOf(u).armor) * shredMult(u))
export const mrOf = (u: UnitLike) => Math.round((heroOf(u).mr + statsOf(u).mr) * shredMult(u))
/** Hệ số sát thương nhận theo giáp: 100 / (100 + giáp) */
export const reduction = (armor: number) => 100 / (100 + Math.max(0,
    armor))
/** Sát thương vật lý sau giáp (trừ sát lực của người ra đòn) */
export const physical = (amount: number, target: UnitLike, src?: UnitLike) =>
    Math.round(amount * reduction(armorOf(target) - (src ? statsOf(src).lethality : 0)))
/** Sát thương phép sau giáp phép (trừ xuyên phép của người ra đòn) */
export const magic = (amount: number, target: UnitLike, src?: UnitLike) =>
    Math.round(amount * reduction(mrOf(target) - (src ? statsOf(src).magicPen : 0)))
/** Tướng đang có mặt trên sân */
export const onBoard = (u: UnitLike) => u.lane >= 0

export function unitAt(state: StateLike, side: string, lane: number, row: string) {
    let found: UnitLike | undefined
    state.units.forEach((u) => { if (u.owner === side && u.lane === lane && u.row === row) found = u })
    return found
}
export function unitsOf(state: StateLike, side: string) {
    const list: UnitLike[] = []
    state.units.forEach((u) => { if (u.owner === side) list.push(u) })
    return list
}
/** Tướng địch nhìn thấy được trong một lane (tiền tuyến trước) */
export function laneEnemies(state: StateLike, side: string, lane: number) {
    return ROWS.map((row) => visible(unitAt(state,
        side,
        lane,
        row))).filter((u): u is UnitLike => !!u)
}
/** Tướng đứng đầu lane (gần hàng quái nhất) */
export function frontMost(state: StateLike, side: string, lane: number) {
    return laneEnemies(state,
        side,
        lane)[0]
}
/** Lane còn tướng nào của `side` không (kể cả đang ẩn): còn thì địch không đánh được trụ lane đó */
export const laneOccupied = (state: StateLike, side: string, lane: number) => ROWS.some((r) => !!unitAt(state,
    side,
    lane,
    r))

// ================= LƯỚI 7x5 =================
// Mỗi bên 3 hàng x 5 đường, hàng quái ở giữa. Khoảng cách tính bằng số ô đi qua (Manhattan, tính cả hàng quái).
type Cell = { owner: string; lane: number; row: string };
/** Khoảng cách giữa 2 ô (cùng phe hoặc khác phe) */
export function distance(a: Cell, b: Cell) {
    const dl = Math.abs(a.lane - b.lane)
    if (a.owner === b.owner) return Math.abs(rowIndex(a.row) - rowIndex(b.row)) + dl
    return rowIndex(a.row) + rowIndex(b.row) + 2 + dl
}
/** Tầm đánh thường theo vai trò */
export const rangeOf = (u: UnitLike) => ROLE_INFO[roleOf(u)].range
/** Hai ô cạnh nhau (8 hướng) trong cùng nửa sân */
export const adjacent = (a: Cell, b: Cell) =>
    a.owner === b.owner && Math.max(Math.abs(a.lane - b.lane),
        Math.abs(rowIndex(a.row) - rowIndex(b.row))) === 1
/** Trụ đường `lane` của `side` còn đứng không */
export const towerAlive = (state: StateLike, side: string, lane: number) => (state.players?.get(side)?.towers?.[lane] ?? 0) > 0

export const hit = (u: UnitLike, amount: number, label: string, kind?: DamageKind): Effect =>
    ({
        type: "damage", target: {
            kind: "unit", id: u.id
        }, amount: Math.round(amount), label, ...(kind ? {
            kind
        } : {
        })
    })
/** Máu cộng thêm (từ đồ, nội tại) = máu tối đa − máu gốc */
export const bonusHpOf = (u: UnitLike) => Math.max(0,
    u.maxHp - heroOf(u).hp)
/** Sát thương chiêu: cộng mọi phần (chưa trừ giáp; phần AD truyền vào `physical`, phần AP vào `magic`) thành MỘT đòn
 *  theo loại sát thương của tướng (damageTypes.ts). Phần `true` (chuẩn) ra đòn riêng. */
export function mixed(u: UnitLike, t: UnitLike, label: string, parts: Partial<Record<DamageKind, number>>): Effect[] {
    const out: Effect[] = []
    const raw = (parts.physical ?? 0) + (parts.magic ?? 0)
    if (raw) out.push(heroDamageKind(u.defId) === "physical" ? hit(t,
        physical(raw,
            t,
            u),
        label,
        "physical") : hit(t,
        magic(raw,
            t,
            u),
        label,
        "magic"))
    if (parts.true) out.push(hit(t,
        parts.true,
        label,
        "true"))
    return out.filter((f) => f.type === "damage" && f.amount > 0)
}

export const hasStatus = (u: UnitLike, s: StatusId) => (u.statuses?.get(s) ?? 0) > 0
export const stackOf = (u: UnitLike, key: string) => u.stacks?.get(key) ?? 0
export const hpPct = (u: UnitLike) => u.hp / u.maxHp
/** Hệ số sát thương nhận vào (vd. Buốt +25%) */
export const damageTakenMult = (u: UnitLike) =>
    (Object.keys(STATUS_INFO) as StatusId[]).reduce((m, s) => (hasStatus(u,
        s) ? m * STATUS_INFO[s].damageTaken : m),
    1)
  * (roleOf(u) === "tank" && u.row === "front" ? 0.9 : 1) // Kiên Cố
export const isDisabled = (u: UnitLike) =>
    (Object.keys(STATUS_INFO) as StatusId[]).some((s) => STATUS_INFO[s].blocksAction && hasStatus(u,
        s))
export const status = (u: UnitLike, s: StatusId, turns: number): Effect => ({
    type: "status", unitId: u.id, status: s, turns
})

/** Số đòn đánh từ Tốc đánh (gốc 100% + `bonus`): mỗi 100% là 1 đòn chắc chắn, phần lẻ là tỉ lệ ra thêm 1 đòn.
 *  140% -> 1 đòn + 40% đòn thứ 2 · 50% -> 50% đánh được 1 đòn · 444% -> 4 đòn + 44% đòn thứ 5. */
export function attackHits(bonus: number, rand: () => number = Math.random) {
    const as = Math.max(0,
            1 + bonus), whole = Math.floor(as)
    return whole + (rand() < as - whole ? 1 : 0)
}

// ================= VÙNG CHIÊU =================
export type CellRef = { lane: number; row: number };
/** Các ô của vùng `shape` đặt tâm ở `center` (cùng một nửa sân; vùng ở mép bàn tự bị cắt).
 *  2×2: tâm + ô bên cạnh (về phía giữa bàn nếu ở mép) + hàng sau (hàng trước nếu tâm ở hậu tuyến).
 *  front3: tiền tuyến ở đường `center` và 2 đường kề. */
export function areaCells(shape: AreaShape, center: CellRef): CellRef[] {
    const out: CellRef[] = []
    const add = (lane: number, row: number) => { if (lane >= 0 && lane < 5 && row >= 0 && row < ROWS.length) out.push({
        lane, row
    }) }
    const { lane: l, row: r } = center
    if (shape === "1x1") add(l,
        r)
    if (shape === "2x2") { const dl = l === 4 ? -1 : 1, dr = r === ROWS.length - 1 ? -1 : 1; add(l,
        r); add(l + dl,
        r); add(l,
        r + dr); add(l + dl,
        r + dr) }
    if (shape === "3x3") for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) add(l + i,
        r + j)
    if (shape === "cross") { add(l,
        r); add(l - 1,
        r); add(l + 1,
        r); add(l,
        r - 1); add(l,
        r + 1) }
    if (shape === "row") for (let i = 0; i < 5; i++) add(i,
        r)
    if (shape === "col") for (let j = 0; j < ROWS.length; j++) add(l,
        j)
    if (shape === "front3") for (let i = -1; i <= 1; i++) add(l + i,
        0)
    return out
}
/** Ô (lane, row) trên nửa sân `side` có nằm trong Tường Băng (vùng có key bắt đầu bằng "wall") không.
 *  Tường Băng: không đi vào / bị dời vào được; tướng đang đứng trong đó bị giam, không tự đi được. */
export function isWallCell(state: StateLike, side: string, lane: number, row: number | string) {
    const r = typeof row === "number" ? row : rowIndex(row)
    const zones = state.zones ? Array.from(state.zones) : []
    return zones.some((z) => z.side === side && z.key.startsWith("wall") && z.turns > 0
    && areaCells(z.shape as AreaShape,
        {
            lane: z.lane, row: z.row
        }).some((c) => c.lane === lane && c.row === r))
}
/** Tướng (nhìn thấy được) của phe `side` đứng trong vùng */
export function unitsInArea(state: StateLike, side: string, shape: AreaShape, center: CellRef): UnitLike[] {
    return areaCells(shape,
        center).map((c) => visible(unitAt(state,
        side,
        c.lane,
        ROWS[c.row]))).filter((x): x is UnitLike => !!x)
}
