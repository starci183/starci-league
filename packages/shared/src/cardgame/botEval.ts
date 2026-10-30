// Chấm điểm một thế cờ cho bot "hard" (đơn vị ~ 1 máu). evaluate(s, side) = giá trị phe `side` − giá trị phe kia.
// Chỉ đọc thông tin `side` NHÌN THẤY: tay đối thủ chỉ tính số lá, token úp của đối thủ tính theo xác suất tiên nghiệm,
// bộ bài chỉ tính số lá (+ Nấm đã công khai cài vào). Gồm: mạng, máu/khiên theo nguy cơ bị hạ, đồ, tay bài, bộ bài
// (nguy cơ cạn), vật triệu hồi, và giá trị TƯƠNG LAI của thế cờ dựng sẵn (dấu, stack, mộ bài...) qua HeroDef.bot.
import {
    skillOfCard
} from "./engine"
import {
    Game
} from "./game"
import {
    hiddenPrior
} from "./botView"
import {
    allHeroes, getHero
} from "./registry"
import {
    COMPONENTS, RULES, otherSide,
    type Card, type GameState, type HeroBotHint, type Role, type Side, type Unit
} from "./types"

export const EVAL = {
    win: 1_000_000,
    life: 700,
    /** mất mạng cuối cùng gần như thua: phạt thêm khi còn ít mạng */
    lastLives: [1400,
        500,
        150] as number[],
    item: 170,
    /** Mảnh đeo riêng (V2): yếu hơn món nhiều, còn chờ ghép tại chỗ */
    component: 70,
    legendInHand: 110,
    presence: {
        marksman: 320, mage: 320, assassin: 300, fighter: 280, tank: 240, support: 280
    } as Record<Role, number>,
    reserve: 140,
    respawnPerRound: 70,
    shield: 0.7,
    // bộ 170 lá, rút 1 lá/lượt: ngưỡng an toàn tính theo số lượt còn rút được
    deckSafe: 14,
    deckPenalty: 14,
    /** 1 điểm mana (thang x10) đáng bấy nhiêu điểm; phần mana vượt `max - hồi` bị lãng phí nên tính nửa */
    manaPoint: 0.6,
    /** Thưởng cho lá Quick (phòng thủ) của tướng sắp gọi khi địch đang có tướng trên sân */
    quickDefense: 25,
    /** Hệ số Đánh thường vượt hạn mức đánh của lượt (lượt sau mới dùng được) */
    basicOverLimit: 0.5,
    /** Trọng số giá trị gọi tướng: vai (đệm nhỏ để lá trên tay quyết định) và 1 đòn đánh thường */
    summonPresence: 0.15,
    summonSwing: 0.6,
    foeHandCard: 38,
    /** Lá trên tay vượt chỗ trống cho lượt rút kế: giữ lại bấy nhiêu phần giá trị, và trừ giá một lá rút bị đốt */
    overflowKeep: 0.3,
    burnCost: 50,
    mushroom: 45,
    marker: 25,
    /** Nhân với nguy cơ bị hạ */
    riskScale: 1,
    /** Phe đang tới lượt còn kịp hồi máu/rút lui trước khi bị đánh: nguy cơ của nó nhân hệ số này */
    riskActive: 0.3,
    /** Hệ số độ dốc sigmoid nguy cơ */
    riskSoft: 0.22,
    burstScale: 0.3,
    hpWeight: 1,
    card: {
        skillBoard: 45, skillReserve: 34, skillDead: 22, ultBonus: 20, basic: 38, basicNoActor: 18, gold: 26, item: 26, draw: 45, other: 36
    } as Record<string, number>,
}

/** Giá trị mặc định mỗi điểm v của trạng thái chung (dương). Dấu: debuff có lợi cho phe gắn, buff có lợi cho phe mang. */
const STATUS_DEBUFF: Record<string, number> = {
    stun: 170, silence: 90, chill: 35, shred: 45, blind: 55, grievous: 25, exhaust: 60, ignite: 1.4, charm: 70, berserk: 40,
}
const STATUS_BUFF: Record<string, number> = {
    empower: 45, stealth: 80, taunt: 15, see_hand: 20, armor_up: 3,
}

let markTable: Record<string, number> | null = null
let buffTable: Record<string, number> | null = null
/** Bảng gộp dấu/buff của mọi tướng (HeroDef.bot) + mặc định; dựng một lần */
function tables() {
    if (!markTable || !buffTable) {
        markTable = {
            ...STATUS_DEBUFF
        }
        buffTable = {
            ...STATUS_BUFF
        }
        for (const h of allHeroes()) {
            for (const [k,
                v] of Object.entries(hintOf(h.id)?.markValue ?? {
                })) markTable[k] = v
            for (const [k,
                v] of Object.entries(hintOf(h.id)?.buffValue ?? {
                })) buffTable[k] = v
        }
    }
    return {
        mark: markTable, buff: buffTable
    }
}

/** Gợi ý chấm điểm của tướng (HeroDef.bot) */
const hintOf = (hero: string): HeroBotHint | undefined => getHero(hero)?.bot
const roleOf = (u: Unit): Role => (u.token ? u.token.role : getHero(u.hero)?.role ?? "fighter")

/** Sức ép chung của phe `side` (chiêu dồn được vào bất kỳ ai): phần chia đều của mỗi tướng trên sân */
function burst(g: Game, side: Side): number {
    let sum = 0
    // đòn đánh thường của xạ thủ: chỉ tính tối đa `attackLimit` đòn mỗi lượt
    const swings: number[] = []
    for (const u of g.board(side)) {
        if (u.token) { sum += 0.5 * u.token.atk; continue }
        if (u.statuses.stun) continue
        sum += 70 + 0.3 * g.ap(u)
        if (roleOf(u) === "marksman") swings.push(g.atk(u) * RULES.roleAttack.marksman * 0.6)
    }
    swings.sort((a, b) => b - a)
    for (const w of swings.slice(0,
        g.attackLimit(side))) sum += w
    return EVAL.burstScale * sum
}
/** Sức ép một lượt lên tướng `u`: phần chung + tướng địch đứng đối diện (đấu sĩ đánh không cần lá ở mức cố định, các vai khác đánh bằng lá) */
function threatOn(g: Game, u: Unit, common: number): number {
    let t = common
    const o = g.opposite(u)
    if (o && !o.statuses.stun && !o.token) {
        const r = roleOf(o)
        const hit = g.atk(o) * RULES.roleAttack[r] * (100 / (100 + (g.hero(o).damage === "magic" ? g.mr(u) : g.armor(u))))
        if (r === "fighter") t += hit * (RULES.fighterCardlessMult + 0.6)
        else if (r !== "marksman") t += hit * 0.8
    }
    return Math.max(120,
        t)
}

/** Xác suất bị hạ trong lượt địch tới với `ehp` máu hiệu dụng trước sức ép `T` */
const deathRisk = (ehp: number, T: number) => 1 / (1 + Math.exp((ehp - T) / (EVAL.riskSoft * T + 40)))

function cardValue(g: Game, side: Side, c: Card): number {
    if (c.kind === "skill" || c.copyOf) {
        const u = g.unit(`${c.side ?? side}:${c.hero}`)
        const r = c.id.endsWith("_r") || c.copyOf?.endsWith("_r") ? EVAL.card.ultBonus : 0
        const C = EVAL.card
        if (!u) return 10
        if (u.status === "board") {
            const def = skillOfCard(c)
            // pháp sư: trừ giá mana; chưa đủ mana thì chỉ còn nửa giá trị
            if (def) {
                const cost = g.manaCost(u,
                    def,
                    c)
                const val = Math.max(6,
                    C.skillBoard + r - cost * EVAL.manaPoint)
                return g.manaOf(u) < cost ? val * 0.5 : val
            }
            return C.skillBoard + r
        }
        if (u.status === "reserve") return C.skillReserve + r
        return C.skillDead + r
    }
    if (c.kind === "special") return c.id === "mushroom" ? -40 : 15
    switch (c.id) {
    case "basic": return g.heroes(side).length ? EVAL.card.basic : EVAL.card.basicNoActor
    case "gold": return EVAL.card.gold
    case "item": return EVAL.card.item
    case "draw": return EVAL.card.draw
    case "legend": return g.heroes(side).some((u) => u.items.length < RULES.itemSlots) ? EVAL.legendInHand : 20
    default: return EVAL.card.other
    }
}

function handValue(g: Game, side: Side): number {
    const vals = g.player(side).hand.map((c) => cardValue(g,
        side,
        c)).sort((a, b) => b - a)
    // lượt rút kế tiếp: lá vượt (tay tối đa − số lá sẽ rút) làm lá rút mới bị ĐỐT, nên lá thấp nhất ở phần vượt chỉ còn
    // một phần giá trị và còn bị trừ giá một lá rút bị đốt (ép bot đánh bài thay vì ôm bài tới tràn tay)
    const room = Math.max(0,
        RULES.handMax - g.drawCount(side))
    let sum = 0
    for (let i = 0; i < vals.length; i++) sum += i < room ? vals[i] : vals[i] * EVAL.overflowKeep - EVAL.burnCost
    // Đánh thường vượt hạn mức đánh của lượt: dùng được ở lượt sau nên chỉ tính một phần
    const basics = g.player(side).hand.filter((c) => c.id === "basic" && c.kind !== "skill").length
    const over = Math.max(0,
        basics - g.attackLimit(side))
    return sum - over * EVAL.card.basic * (1 - EVAL.basicOverLimit)
}

function deckValue(s: GameState, side: Side): number {
    const deck = s.players[side].deck
    const d = deck.length
    let v = 0
    if (d < EVAL.deckSafe) v -= (EVAL.deckSafe - d) ** 2 * EVAL.deckPenalty
    if (d === 0) v -= 1500
    // Nấm (Teemo) trong bộ: công khai lúc cài vào, mỗi lá là 3 lá bị đốt + sát thương
    let mush = 0
    for (const c of deck) if (c.kind === "special" && c.id === "mushroom") mush++
    v -= mush * EVAL.mushroom
    return v
}

/** Giá trị trạng thái trên `u` cho phe của u (debuff âm, buff dương) */
function statusValue(g: Game, u: Unit): number {
    const t = tables()
    let v = 0
    for (const [id,
        st] of Object.entries(u.statuses)) {
        const left = Math.max(0,
            st.until - g.s.turnNo)
        const dur = 1 + 0.2 * Math.min(2,
            Math.floor(left / 2))
        const src = st.src ? g.unit(st.src) : undefined
        const fromFoe = src ? src.side !== u.side : id in t.mark && !(id in t.buff)
        const per = fromFoe ? t.mark[id] ?? 20 : t.buff[id] ?? 8
        // dấu chờ kích nổ cần tướng gắn dấu còn trên sân mới nổ được
        const live = src && !src.token && src.status !== "board" ? 0.5 : 1
        const amt = Math.min(6,
            Math.max(1,
                Math.abs(st.v || 1)))
        const w = per * (id === "ignite" ? Math.abs(st.v) : amt) * dur * live
        v += fromFoe ? -w : w
    }
    for (const b of u.nextAttack) v += 10 + 0.5 * (b.bonusRaw ?? 0)
    return v
}

function stackValue(u: Unit): number {
    const h = hintOf(u.hero)?.stackValue
    let v = 0
    if (h) for (const [k,
        x] of Object.entries(h)) v += (u.stacks[k] ?? 0) * x
    if (u.stacks.itemAmp) v += u.stacks.itemAmp * 1.2 * Math.max(1,
        u.items.length)
    if (u.stacks.bonusRes && !h?.bonusRes) v += u.stacks.bonusRes * 4
    return v
}

function tokenValue(g: Game, tok: Unit, viewer: Side): number {
    const k = tok.token!
    const owner = k.ownerId ? g.unit(k.ownerId) : undefined
    const hint = owner ? hintOf(owner.hero) : undefined
    let v = 40 + 0.35 * tok.hp + 0.7 * tok.shield + 1.2 * k.atk
    if (hint?.tokenValue) v += hint.tokenValue
    if (hint?.tokenStackValue) for (const [key,
        x] of Object.entries(hint.tokenStackValue)) v += (tok.stacks[key] ?? 0) * x
    // token úp: phe chủ biết thật/giả; đối thủ chỉ đoán theo tiên nghiệm
    if (k.secret && "real" in k.secret) {
        const p = k.hidden && tok.side !== viewer ? hiddenPrior(g.s,
            k.ownerId) : Number(k.secret.real) === 1 ? 1 : 0
        v *= 0.25 + 0.75 * p
    }
    return v
}

/** Các thành phần của giá trị một phe (cộng lại = sideValue). Tách riêng để học trọng số từ dữ liệu selfplay (VALUE_MODEL). */
export const TERM_KEYS = ["life",
    "mana",
    "lastLives",
    "token",
    "items",
    "reserve",
    "deadStack",
    "respawn",
    "presence",
    "hp",
    "shield",
    "risk",
    "status",
    "stack",
    "grave",
    "hand",
    "foeHand",
    "deck",
    "marker"] as const
export type TermKey = typeof TERM_KEYS[number];
type Terms = Record<TermKey, number>
const zeroTerms = (): Terms => Object.fromEntries(TERM_KEYS.map((k) => [k,
    0])) as Terms

/** Giá trị phe `side` nhìn từ `viewer`, theo từng thành phần */
function sideTerms(g: Game, side: Side, viewer: Side, common: number): Terms {
    const s = g.s
    const p = s.players[side]
    const t = zeroTerms()
    t.life = EVAL.life * p.lives
    const mana = g.teamManaOf(side)
    const safeMana = Math.min(mana,
        Math.max(0,
            RULES.teamManaMax - g.teamManaRegen(side)))
    t.mana = EVAL.manaPoint * (safeMana + .5 * (mana - safeMana))
    for (let i = 0; i < EVAL.lastLives.length; i++) if (p.lives <= i + 1) t.lastLives -= EVAL.lastLives[i]
    for (const u of Object.values(s.units)) {
        if (u.side !== side) continue
        if (u.token) { if (u.status === "board") t.token += tokenValue(g,
            u,
            viewer); continue }
        const role = roleOf(u)
        for (const id of u.items) t.items += (COMPONENTS as readonly string[]).includes(id) ? EVAL.component : EVAL.item
        // stack giữ qua lúc chưa gọi / chờ hồi sinh (Đêm của Vayne, Đói của Kog'Maw...) vẫn là tài sản
        if (u.status === "reserve") { t.reserve += EVAL.reserve; t.stack += stackValue(u); continue }
        if (u.status === "dead") { t.deadStack += stackValue(u); t.respawn -= Math.max(0,
            u.respawnRound - s.round) * EVAL.respawnPerRound; continue }
        const soak = g.soakOf(u)
        const ehp = u.hp + EVAL.shield * g.totalShield(u) + (soak ? 0.6 * soak.hp : 0)
        t.presence += EVAL.presence[role]
        t.hp += (role === "tank" ? 0.75 : 1) * EVAL.hpWeight * Math.min(u.hp,
            u.maxHp)
        t.shield += EVAL.shield * g.totalShield(u)
        t.risk -= (s.active === side ? EVAL.riskActive : 1) * EVAL.riskScale * (EVAL.life + EVAL.presence[role] * 0.5) * deathRisk(ehp,
            threatOn(g,
                u,
                common)) * (u.statuses.stealth ? 0.4 : 1)
        t.status += statusValue(g,
            u)
        t.stack += stackValue(u)
    }
    // mộ bài là tài nguyên (Viktor bậc, Zed, Yorick)
    for (const h of p.heroes) {
        const gv = hintOf(h)?.graveCardValue
        if (!gv) continue
        let n = 0
        for (const c of p.grave) if (c.kind === "skill" && c.hero === h) n++
        t.grave += gv * Math.min(n,
            12)
    }
    if (side === viewer) t.hand = handValue(g,
        side)
    else t.foeHand = p.hand.length * EVAL.foeHandCard
    t.deck = deckValue(s,
        side)
    const mk = s.markers?.[side]
    if (mk) for (const l of mk) t.marker += l.length * EVAL.marker
    return t
}

/** Trọng số học từ selfplay cho từng thành phần (null = 1 cho mọi thành phần, tức bộ chấm viết tay) */
export const VALUE_MODEL: { w: Partial<Record<TermKey, number>> | null } = {
    w: null
}

/** Hiệu thành phần (side − đối thủ), nhìn từ `side`. Dùng để ghi dữ liệu huấn luyện. */
export function evalTermDiff(s: GameState, side: Side): Terms {
    const g = new Game(s)
    const foe = otherSide(side)
    const a = sideTerms(g,
        side,
        side,
        burst(g,
            foe))
    const b = sideTerms(g,
        foe,
        side,
        burst(g,
            side))
    const d = zeroTerms()
    for (const k of TERM_KEYS) d[k] = a[k] - b[k]
    return d
}

/** Điểm thế cờ cho `side` (dương = tốt cho side). Không dùng thông tin ẩn với `side`. */
export function evaluate(s: GameState, side: Side): number {
    if (s.phase === "over") return s.winner === side ? EVAL.win : s.winner ? -EVAL.win : 0
    const d = evalTermDiff(s,
        side)
    const w = VALUE_MODEL.w
    let v = 0
    for (const k of TERM_KEYS) v += d[k] * (w?.[k] ?? 1)
    return v
}
/** Giá trị 1 đòn Đánh thường của tướng `u` (chưa tính giáp), dùng để so sánh các tướng với nhau */
const swingOf = (g: Game, u: Unit) => g.atk(u) * RULES.roleAttack[roleOf(u)] * EVAL.summonSwing

/**
 * Giá trị gọi tướng `hero` ra sân của phe `side`, CHỈ dùng tay mình + sân công khai (không nhìn lựa chọn úp của địch):
 * - lá chiêu của tướng đó trên tay thành lá sống (trừ giá mana với pháp sư; lá Quick được cộng phòng thủ khi địch có tướng)
 * - Trợ thủ: Q và E lấy từ bộ lên tay khi được gọi
 * - Đánh thường trên tay + đòn không cần lá của đấu sĩ, chỉ tính phần tăng thêm so với sân hiện tại
 * - đệm nhỏ theo vai (để lá trên tay quyết định)
 */
export function summonValue(s: GameState, side: Side, hero: string): number {
    const def = getHero(hero)
    const g = new Game(s)
    const u = g.unit(`${side}:${hero}`)
    if (!def || !u) return 0
    const p = s.players[side]
    const C = EVAL.card
    const threatened = g.heroes(otherSide(side)).length > 0
    const mage = def.role === "mage"
    const boardVal = (c: Card): number => {
        const d = skillOfCard(c)
        const r = c.id.endsWith("_r") ? C.ultBonus : 0
        let v = C.skillBoard + r
        if (mage && d) v = Math.max(6,
            v - g.manaCost(u,
                d,
                c) * EVAL.manaPoint)
        if (d?.quick && threatened) v += EVAL.quickDefense
        return v
    }
    let v = 0
    // lá chiêu của tướng trên tay: sống lên so với giá trị hiện tại (tướng dự bị)
    for (const c of p.hand) {
        if (c.kind !== "skill" || c.hero !== hero) continue
        const r = c.id.endsWith("_r") ? C.ultBonus : 0
        v += Math.max(0,
            boardVal(c) - (u.status === "reserve" ? C.skillReserve : C.skillDead) - r)
    }
    // Trợ thủ lấy Q và E lên tay
    if (def.role === "support") {
        let room = RULES.handMax - p.hand.length
        for (const k of RULES.supportSummonKeys) {
            const d = def.skills[k]
            if (room <= 0 || !d) continue
            room--
            v += 0.8 * (C.skillBoard + (d.quick && threatened ? EVAL.quickDefense : 0))
        }
    }
    // Đánh thường + đòn không cần lá: chỉ tính phần tăng thêm so với sân hiện tại
    const basics = p.hand.filter((c) => c.id === "basic" && c.kind !== "skill").length
    const slots = Math.max(0,
        s.active === side ? g.attacksLeft(side) : g.attackLimit(side))
    const used = Math.min(basics,
        slots)
    const mine = g.heroes(side)
    const best = mine.reduce((m, x) => Math.max(m,
        swingOf(g,
            x)),
    0)
    const sw = swingOf(g,
        u)
    v += used * Math.max(0,
        sw - best)
    if (def.role === "fighter") {
        const spare = slots - used - mine.filter((x) => roleOf(x) === "fighter").length
        if (spare > 0) v += sw * RULES.fighterCardlessMult
    }
    v += EVAL.summonPresence * EVAL.presence[def.role]
    // tướng mạnh lên khi còn ngoài sân (Vayne nạp Đêm): gợi ý hoãn gọi
    v -= def.bot?.holdBack?.(g,
        u) ?? 0
    return v
}

/** Điểm phụ chọn đường gọi tướng `hero` (không đổi thứ hạng giữa các tướng): đối đầu với tướng địch đã ở đường đó */
export function summonLaneFit(s: GameState, side: Side, hero: string, lane: number): number {
    const g = new Game(s)
    const u = g.unit(`${side}:${hero}`)
    const o = g.at(otherSide(side),
        lane)
    if (!u || !o || o.status !== "board" || o.token) return 0
    const hit = (a: Unit, b: Unit) => g.atk(a) * RULES.roleAttack[roleOf(a)] * (100 / (100 + (g.hero(a).damage === "magic" ? g.mr(b) : g.armor(b))))
    return Math.max(-12,
        Math.min(12,
            0.25 * (hit(u,
                o) - hit(o,
                u))))
}
