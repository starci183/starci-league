// Góc nhìn của bot: dựng một "thế giới giả định" (determinization) chỉ từ thông tin mà `side` được thấy, để bot tìm kiếm
// trên đó mà không nhìn trộm: thứ tự bộ bài (cả của mình), tay đối thủ, lá thưởng úp, bí mật của token úp, và RNG tương lai.
// Phần nhìn thấy (sân, tay mình, mộ, số lá) giữ nguyên. Thêm: dấu vân tay (fingerprint) của phần nhìn thấy để nhận ra
// "thế cờ đã đi đúng như kế hoạch" (bot giữ kế hoạch cả lượt, lệch thì lập lại).
import {
    cloneDeep
} from "./clone"
import {
    getHero
} from "./registry"
import {
    RULES, otherSide,
    type Card, type GameState, type Side
} from "./types"

/** RNG nhỏ (mulberry32) tách khỏi RNG của trận */
export function makeRng(seed: number): () => number {
    let r = seed >>> 0
    return () => {
        r = (r + 0x6d2b79f5) >>> 0
        let t = r
        t = Math.imul(t ^ (t >>> 15),
            t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7),
            t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}
export const hashInts = (...xs: number[]) => {
    let h = 2166136261 >>> 0
    for (const x of xs) {
        h = Math.imul(h ^ (x >>> 0),
            16777619) >>> 0
        h = Math.imul(h ^ (h >>> 13),
            0x5bd1e995) >>> 0
    }
    return h >>> 0
}
function shuffle<T>(a: T[], rnd: () => number): T[] {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1))
        const t = a[i]
        a[i] = a[j]
        a[j] = t
    }
    return a
}

/** Kho lá thưởng (trùng engine.ts PRIZE_POOL: thẻ hỗ trợ, công khai trong luật) */
const PRIZE_IDS = ["basic",
    "basic",
    "gold",
    "item",
    "draw",
    "spell_heal",
    "spell_barrier",
    "spell_flash",
    "spell_cleanse"]

/** Phe `side` đang được thấy tay đối thủ (Ahri E / Twisted Fate R gắn "see_hand" lên tướng mình) */
export const seesHand = (s: GameState, side: Side) => Object.values(s.units).some((u) => u.side === side && u.status === "board" && !!u.statuses.see_hand)

/** Xác suất tiên nghiệm token úp là thật (gợi ý của tướng chủ, mặc định 0.5) */
export function hiddenPrior(s: GameState, tokenOwner?: string): number {
    const owner = tokenOwner ? s.units[tokenOwner] : undefined
    return owner ? getHero(owner.hero)?.bot?.hiddenPrior ?? 0.5 : 0.5
}

/**
 * Bản sao state chỉ dựa trên thông tin `side` thấy được; phần ẩn được lấy mẫu lại bằng `salt`.
 * - bộ bài mình: xáo lại (không biết thứ tự) · tay + bộ đối thủ: gộp, xáo, chia lại đúng số lá (trừ khi đang thấy tay)
 * - lá thưởng úp hai bên: lấy mẫu lại từ kho · token úp của đối thủ: bí mật lấy mẫu theo tiên nghiệm
 * - RNG của trận: gieo lại (bot không biết trước chí mạng/né/rút)
 */
export function determinize(real: GameState, side: Side, salt: number): GameState {
    const s = cloneDeep(real)
    const rnd = makeRng(hashInts(real.seed,
        real.turnNo,
        real.actionsThisTurn,
        side === "A" ? 1 : 2,
        salt))
    const foe = otherSide(side)
    shuffle(s.players[side].deck,
        rnd)
    const fp = s.players[foe]
    if (seesHand(real,
        side)) shuffle(fp.deck,
        rnd)
    else {
        const pool = shuffle([...fp.hand,
            ...fp.deck],
        rnd)
        const n = fp.hand.length
        fp.hand = pool.slice(0,
            n)
        fp.deck = pool.slice(n)
    }
    for (const sd of [side,
        foe]) {
        s.prizeCards[sd] = s.prizeCards[sd].map((c): Card => ({
            uid: c.uid, kind: "support", id: PRIZE_IDS[Math.floor(rnd() * PRIZE_IDS.length)]
        }))
    }
    for (const u of Object.values(s.units)) {
        const tk = u.token
        if (!tk?.hidden || u.side === side) continue
        const p = hiddenPrior(s,
            tk.ownerId)
        if (tk.secret) {
            const sec: Record<string, string | number> = {
            }
            for (const k of Object.keys(tk.secret)) sec[k] = rnd() < p ? 1 : 0
            tk.secret = sec
        }
        if (tk.card) tk.card = {
            uid: tk.card.uid, kind: "support", id: "basic"
        }
    }
    // gọi tướng úp: KHÔNG được thấy lựa chọn của đối thủ, thay bằng mẫu ngẫu nhiên (cùng số lượng, tướng dự bị + đường trống)
    if (s.blind) {
        const heroes = shuffle(s.players[foe].heroes.filter((h) => s.units[`${foe}:${h}`]?.status === "reserve"),
            rnd)
        const lanes = shuffle(s.lanes[foe].map((id, i) => (id === null && RULES.laneOpenRound[i] <= s.round ? i : -1)).filter((i) => i >= 0),
            rnd)
        const n = s.blind.picks[foe].length
        s.blind.picks[foe] = []
        for (let i = 0; i < n && i < heroes.length && i < lanes.length; i++) s.blind.picks[foe].push({
            hero: heroes[i], lane: lanes[i]
        })
    }
    s.rng = hashInts(real.rng,
        salt,
        0x9e3779b9)
    return s
}

const cardSig = (c: Card) => `${c.kind}|${c.id}|${c.hero ?? ""}|${c.item ?? ""}|${c.copyOf ?? ""}|${c.temp ? 1 : 0}`

/**
 * Dấu vân tay của phần `side` nhìn thấy: sân, trạng thái, tay mình, số lá, chuỗi. Hai state cùng dấu vân tay thì kế hoạch
 * lập trên state này còn dùng được trên state kia.
 */
export function fingerprint(s: GameState, side: Side): string {
    const parts: string[] = [s.phase,
        s.active,
        String(s.turnNo),
        String(s.chain?.links.length ?? 0),
        String(s.chain?.priority ?? "")]
    parts.push(`mana:${s.teamMana?.A ?? RULES.teamManaStart}:${s.teamMana?.B ?? RULES.teamManaStart}`)
    const ids = Object.keys(s.units).sort()
    for (const id of ids) {
        const u = s.units[id]
        let st = ""
        for (const k of Object.keys(u.statuses).sort()) st += `${k}:${u.statuses[k].v}:${u.statuses[k].until},`
        let sk = ""
        for (const k of Object.keys(u.stacks).sort()) sk += `${k}:${u.stacks[k]},`
        parts.push(`${id}/${u.status}/${u.lane}/${u.hp}/${u.shield}:${u.shieldPhys ?? 0}:${u.shieldMagic ?? 0}/${u.items.join("+")}/${st}/${sk}/${u.nextAttack.length}`)
    }
    for (const sd of [side,
        otherSide(side)]) {
        const p = s.players[sd]
        parts.push(`${sd}:${p.lives}:${p.deck.length}:${p.hand.length}:${p.grave.length}:${s.prizes[sd]}`)
    }
    for (const ta of [s.turnAttacks,
        s.offTurnAttacks]) parts.push(`${ta?.used ?? 0}:${(ta?.cardless ?? []).join("+")}`)
    // bước gọi tướng úp: chỉ lựa chọn của chính mình + trạng thái chốt (công khai)
    if (s.blind) parts.push(`blind:${s.blind.ready.A ? 1 : 0}${s.blind.ready.B ? 1 : 0}:${s.blind.picks[side].map((x) => `${x.hero}@${x.lane}`).join("+")}:${s.blind.picks[otherSide(side)].length}`)
    parts.push(s.players[side].hand.map(cardSig).join(","))
    parts.push(String(s.extra.A),
        String(s.extra.B))
    if (s.markers) parts.push(JSON.stringify(s.markers))
    return parts.join("|")
}
