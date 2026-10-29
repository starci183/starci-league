// Luật chung: server dùng để xử lý, client dùng để tô sáng nước đi hợp lệ.
// Chỉ đọc state, không sửa. Mọi thay đổi trả về dạng Effect để server áp dụng.
// Luật vai trò nằm ở đây; cái riêng của từng tướng nằm trong adapter (heroes/).
import {
    CARDS, getHero, getSkill, SKILLS
} from "./registry"
import {
    AreaShape, NEXUS_PROTECT_UNTIL_ROUND, ROLE_INFO, ROWS, Row, openLanes, rowIndex, roundOf
} from "./cards"
import {
    adjacent, areaCells, atkOf, damageTakenMult, hasStatus, laneEnemies, distance, heroOf, isCarry, isDisabled, isWallCell, laneOccupied, magic, other, physical, rangeOf, roleOf, towerAlive, unitAt
} from "./helpers"
import type {
    Effect, ISkillBoost, StateLike, Target, UnitLike
} from "./types"
import {
    itemExtraTargets, outgoing
} from "./items/engine"
import {
    statsOf
} from "./items/stats"

export const sameTarget = (a: Target, b: Target) =>
    a.kind === "unit" ? b.kind === "unit" && a.id === b.id : b.kind === "tower" && a.side === b.side && a.lane === b.lane
export const canAct = (state: StateLike, u: UnitLike) =>
    u.owner === state.activeSide && u.lane >= 0 && u.summonedTurn !== state.turn && !isDisabled(u)
/** Nhà còn bảo hộ? (trước vòng NEXUS_PROTECT_UNTIL_ROUND) */
export const nexusProtected = (state: StateLike) => roundOf(state.turn) < NEXUS_PROTECT_UNTIL_ROUND
/** Được đánh Nhà lượt này không: hết bảo hộ và chưa tướng nào đánh Nhà trong lượt */
export const canHitNexus = (state: StateLike) => !nexusProtected(state) && !state.nexusHit

/** Ô (lane, row) hợp lệ để đặt tướng `defId` (đúng hàng theo vai trò, ô trống) */
export function canSummonAt(state: StateLike, side: string, defId: string, lane: number, row: Row) {
    const card = CARDS[defId]
    return card?.kind === "hero" && openLanes(Math.max(1,
        roundOf(state.turn))).includes(lane) && ROLE_INFO[card.role].rows.includes(row) && !unitAt(state,
        side,
        lane,
        row)
}
/** Số tướng của `side` đang trên sân */
export function boardCount(state: StateLike, side: string) {
    let n = 0
    state.units.forEach((u) => { if (u.owner === side && u.lane >= 0) n++ })
    return n
}

/** Lượt đi được cấp thêm (Tốc Biến, chiêu "đi thêm 1 ô"): khoá t: nên hết khi chủ tướng kết thúc lượt */
export const MOVE_TOKEN = "t:move"
/** Đi lại không miễn phí: chỉ sát thủ (Lướt) được tự đi 1 ô mỗi lượt; tướng khác cần lượt đi được cấp (Tốc Biến, chiêu) */
export const canMove = (u: UnitLike) => (roleOf(u) === "assassin" && !u.moved) || (u.stacks?.get(MOVE_TOKEN) ?? 0) > 0
/** Ô trống (8 hướng quanh tướng, trong nửa sân mình) tướng đi tới được; đi xong vẫn đánh/tung chiêu được */
export function moveTargets(state: StateLike, u: UnitLike): { lane: number; row: Row }[] {
    if (!canMove(u) || !canAct(state,
        u)) return []
    // Tường Băng: đứng trong tường thì bị giam, ô tường không đi vào được
    if (isWallCell(state,
        u.owner,
        u.lane,
        u.row)) return []
    const out: { lane: number; row: Row }[] = []
    const open = openLanes(Math.max(1,
        roundOf(state.turn)))
    for (const row of ROWS) for (const lane of open) {
        if (adjacent(u,
            {
                owner: u.owner, lane, row
            }) && !unitAt(state,
            u.owner,
            lane,
            row) && !isWallCell(state,
            u.owner,
            lane,
            row)) out.push({
            lane, row
        })
    }
    return out
}

/** Tướng địch thấy được, trong tầm của `a`, gần nhất trước (bằng nhau thì ít máu trước) */
export function enemiesInRange(state: StateLike, a: UnitLike, range = rangeOf(a)) {
    const list: UnitLike[] = []
    state.units.forEach((x) => { if (x.owner !== a.owner && x.lane >= 0 && !x.hidden && distance(a,
        x) <= range) list.push(x) })
    return list.sort((x, y) => distance(a,
        x) - distance(a,
        y) || x.hp - y.hp)
}

/** Đánh thường tự nhắm: địch gần nhất trong tầm (sát thủ ưu tiên xạ thủ/pháp sư trong tầm).
 *  Không có ai trong tầm và đường của mình bên địch trống: đánh trụ đường đó, trụ sập thì đánh Nhà. */
export function attackTargets(state: StateLike, a: UnitLike): Target[] {
    if (a.attacked || !canAct(state,
        a)) return []
    const e = other(a.owner)
    const out: Target[] = []
    const add = (t?: Target) => { if (t && !out.some((x) => sameTarget(x,
        t))) out.push(t) }

    getHero(a.defId)?.extraTargets?.({
        state, unit: a
    }).forEach(add)
    itemExtraTargets(state,
        a).forEach(add) // đồ (vd. Đại Bác Liên Thanh)
    let pool = enemiesInRange(state,
        a)
    if (roleOf(a) === "assassin") {
    // Lướt: với tới mọi hàng trong cùng đường, ưu tiên xạ thủ/pháp sư
        for (const x of laneEnemies(state,
            e,
            a.lane)) if (!pool.includes(x)) pool.push(x)
        pool.sort((x, y) => distance(a,
            x) - distance(a,
            y) || x.hp - y.hp)
        if (pool.some(isCarry)) pool = pool.filter(isCarry)
    }
    const nearest = pool.length ? distance(a,
        pool[0]) : 0
    pool.filter((x) => distance(a,
        x) === nearest).forEach((x) => add({
        kind: "unit", id: x.id
    }))
    if (!pool.length && !laneOccupied(state,
        e,
        a.lane) && !nexusProtected(state) && (towerAlive(state,
        e,
        a.lane) || canHitNexus(state))) {
        add({
            kind: "tower", side: e, lane: a.lane
        })
    }
    return out
}

/** Đòn đánh thường: tướng (hoặc luật vai trò) tính, rồi đồ chỉnh (chí mạng, % sát thương, hút máu, nội tại).
 *  `live` = server tính thật (tung xúc xắc, chạy hook); client để false khi xem trước. */
export function computeAttack(state: StateLike, a: UnitLike, t: Target, live = false): Effect[] {
    const base = getHero(a.defId)?.attack?.({
        state, unit: a, target: t
    }) ?? defaultAttack(state,
        a,
        t)
    return outgoing(state,
        a,
        base,
        {
            isSkill: false, live
        })
}

/** Đòn đánh thường theo luật vai trò. Adapter có thể gọi lại rồi chỉnh thêm. */
export function defaultAttack(state: StateLike, a: UnitLike, t: Target): Effect[] {
    const atk = atkOf(a), role = roleOf(a), e = other(a.owner)
    if (t.kind === "tower") return [{
        type: "damage", target: t, amount: atk, label: towerAlive(state,
            t.side,
            t.lane) ? "đánh trụ" : "đánh Nhà"
    }]

    const target = state.units.get(t.id)
    if (!target) return []
    if (role === "mage") {
    // phép trúng mục tiêu, lan 50% sang các ô kề bên
        const fx: Effect[] = [{
            type: "damage", target: t, amount: magic(atk,
                target,
                a), label: "phép"
        }]
        state.units.forEach((u) => {
            if (u.owner === e && u.lane >= 0 && !u.hidden && adjacent(u,
                target)) fx.push({
                type: "damage", target: {
                    kind: "unit", id: u.id
                }, amount: magic(atk * 0.5,
                    u,
                    a), label: "phép lan"
            })
        })
        return fx
    }
    // sát thủ lướt vào carry: +20%
    const bonus = role === "assassin" && isCarry(target) ? 1.2 : 1
    // Bắn Tỉa: mục tiêu lượt trước không di chuyển (cờ moved của nó chỉ xoá khi tới lượt nó)
    const snipe = role === "marksman" && !target.moved ? 1.1 : 1
    // Tay Đôi: đấu sĩ đánh mục tiêu đứng một mình trong đường của nó (1 đấu 1)
    const duel = role === "fighter" && laneEnemies(state,
        e,
        target.lane).length === 1 ? 1.15 : 1
    const fx: Effect[] = [{
        type: "damage", target: t, amount: physical(atk * bonus * snipe * duel,
            target,
            a),
        label: bonus > 1 ? "lướt +20%" : snipe > 1 ? "Bắn Tỉa" : duel > 1 ? "Tay Đôi" : "đánh thường"
    }]
    return fx
}

/** Mana TƯỚNG cần để tung chiêu (sau giảm từ đồ) */
export const skillCost = (u: UnitLike, skillId: string) => Math.max(0,
    (SKILLS[skillId]?.mana ?? 0) - statsOf(u).manaDiscount)

export function canCast(state: StateLike, u: UnitLike, skillId: string) {
    const s = SKILLS[skillId]
    // Q/W/E/R combo thoải mái trong lượt: chỉ Mana/Nộ và hồi chiêu chặn (hồi chiêu ≥ 1 nên mỗi chiêu 1 lần/lượt)
    return !!s && heroOf(u).skills.includes(skillId) && canAct(state,
        u) && !hasStatus(u,
        "silence")
    && (u.cooldowns.get(skillId) ?? 0) === 0 && (u.mana ?? 0) >= skillCost(u,
        skillId)
}

export function skillTargets(state: StateLike, u: UnitLike, skillId: string): string[] {
    const impl = getSkill(skillId)
    if (!impl) return []
    if (impl.targets) return impl.targets({
        state, unit: u
    })
    const ids: string[] = []
    state.units.forEach((x) => {
        if (x.lane < 0) return // ngoài sân
        if (impl.def.target === "enemyAny" && x.owner !== u.owner && !x.hidden) ids.push(x.id)
        if (impl.def.target === "allyLane" && x.owner === u.owner && x.lane === u.lane) ids.push(x.id)
    })
    return ids
}

/** Vùng có máu đang khiêu khích tướng `u` (u đứng trong vùng của phe địch đặt trên nửa sân của u), nếu có */
export function tauntZoneOf(state: StateLike, u: UnitLike) {
    const zs = state.zones
    if (!zs || u.lane < 0) return undefined
    for (let i = 0; i < zs.length; i++) {
        const z = zs[i]
        if (!z.hp || z.hp <= 0 || z.owner === u.owner || z.side !== u.owner) continue
        if (areaCells(z.shape as AreaShape,
            {
                lane: z.lane, row: z.row
            }).some((c) => c.lane === u.lane && c.row === rowIndex(u.row))) return z
    }
    return undefined
}

/** Chiêu chọn tâm (`cell`): các ô hợp lệ. Mặc định mọi ô ở đường đang mở, bên nửa sân theo def.cellSide (mặc định địch) */
export function skillCells(state: StateLike, u: UnitLike, skillId: string): { lane: number; row: Row }[] {
    const impl = getSkill(skillId)
    if (!impl || impl.def.target !== "cell") return []
    if (impl.cells) return impl.cells({
        state, unit: u
    })
    return openLanes(roundOf(state.turn)).flatMap((lane) => ROWS.map((row) => ({
        lane, row
    })))
}
/** Nửa sân chứa tâm của chiêu `cell` */
export const skillCellSide = (u: UnitLike, skillId: string) => (SKILLS[skillId]?.cellSide === "ally" ? u.owner : other(u.owner))

export function computeSkill(state: StateLike, u: UnitLike, skillId: string, targetId?: string, live = false, cell?: { lane: number; row: Row }): Effect[] {
    const impl = getSkill(skillId)
    const base = impl?.resolve({
        state, unit: u, targetId, cell
    }) ?? []
    return outgoing(state,
        u,
        applyBoosts(state,
            u,
            impl?.boosts ?? [],
            base),
        {
            isSkill: true, live
        })
}

/** Áp ISkillBoost: với mỗi tướng địch trúng chiêu, điều kiện nào thoả thì nhân sát thương và thêm hiệu ứng */
function applyBoosts(state: StateLike, u: UnitLike, boosts: ISkillBoost[], effects: Effect[]): Effect[] {
    if (!boosts.length) return effects
    const extra: Effect[] = []
    const hitOnce = new Set<string>()
    const out = effects.map((fx) => {
        if (fx.type !== "damage" || fx.target.kind !== "unit") return fx
        const t = state.units.get(fx.target.id)
        if (!t || t.owner === u.owner) return fx
        let m = 1
        for (const b of boosts) {
            if (!b.condition.test({
                state, self: u, target: t, isSkill: true, preview: true
            })) continue
            m *= b.mult ?? 1
            if (b.extra && !hitOnce.has(`${b.desc}|${t.id}`)) { hitOnce.add(`${b.desc}|${t.id}`); extra.push(...b.extra({
                state, unit: u, target: t
            })) }
        }
        return m === 1 ? fx : {
            ...fx, amount: Math.round(fx.amount * m), label: `${fx.label} `
        }
    })
    return [...out,
        ...extra]
}

/** Tổng sát thương một hành động gây lên một mục tiêu, để client hiển thị trước */
export function previewOn(state: StateLike, effects: Effect[], t: Target) {
    const mult = t.kind === "unit" ? damageTakenMult(state.units.get(t.id)!) : 1
    return effects.reduce((sum, fx) => (fx.type === "damage" && sameTarget(fx.target,
        t) ? sum + Math.round(fx.amount * mult) : sum),
    0)
}
