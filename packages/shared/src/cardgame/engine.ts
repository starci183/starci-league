// Engine thuần: newGame / legalActions / applyAction. Không phụ thuộc Colyseus, state là JSON.
import {
    cloneDeep
} from "./clone"
import {
    getItem
} from "../items"
import {
    formulaText, pct
} from "./formula"
import {
    Game, cardItemStats
} from "./game"
import {
    DEFAULT_DECK, parseDeckCard, validateDeck, type DeckCardId
} from "./deck"
import {
    CARD_ITEMS, cardCombine, hasAnyTarget, itemText
} from "./items"
import {
    getHero, getSpecialCard, getTokenBehavior, implementedHeroes
} from "./registry"
import {
    SPELL_VI, resolveSpell, spellOf, spellOptions
} from "./spells"
import {
    COMPONENTS, RULES, SIDES, otherSide,
    type Action, type Card, type ChainLink, type Ctx, type GameEvent, type GameState, type OptCtx, type PlayArgs, type ReactFx, type Side, type SkillDef, type SkillKey,
    type TargetKind, type Trigger, type Unit,
} from "./types"

// ======================================================================
// Khởi tạo
// ======================================================================
export function newGameEx(seed: number, teamA: string[], teamB: string[], decks: Partial<Record<Side, DeckCardId[]>> = {
}): { state: GameState; events: GameEvent[] } {
    const teams: Record<Side, string[]> = {
        A: teamA, B: teamB
    }
    const s: GameState = {
        seed, rng: seed >>> 0, nextUid: 1, round: 1, turnNo: 1, active: "A", phase: "main", actionsThisTurn: 0,
        players: {
            A: {
                side: "A", heroes: teamA, deck: [], hand: [], grave: [], lives: RULES.lives
            },
            B: {
                side: "B", heroes: teamB, deck: [], hand: [], grave: [], lives: RULES.lives
            },
        },
        units: {
        }, lanes: {
            A: [null,
                null,
                null,
                null,
                null], B: [null,
                null,
                null,
                null,
                null]
        },
        chain: null, extra: {
            A: null, B: null
        }, prizes: {
            A: 0, B: 0
        }, prizeCards: {
            A: [], B: []
        }, winner: null, endReason: null,
        stats: {
            A: {
                kills: 0, damage: 0, cardsPlayed: 0
            }, B: {
                kills: 0, damage: 0, cardsPlayed: 0
            }
        },
    }
    const g = new Game(s)
    for (const side of SIDES) {
        for (const h of teams[side]) {
            const def = getHero(h)
            if (!def) throw new Error(`Không có tướng ${h}`)
            s.units[`${side}:${h}`] = {
                id: `${side}:${h}`, hero: h, side, status: "reserve", lane: -1, homeLane: -1,
                hp: def.hp, maxHp: def.hp, shield: 0, items: [], statuses: {
                }, stacks: {
                }, nextAttack: [], respawnRound: 0, deaths: 0,
            }
        }
        const p = s.players[side]
        // bộ gốc 40 lá do người chơi xếp (deck.ts); thiếu thì DEFAULT_DECK. Thêm 9 lá chiêu (4Q 4E 1R) của mỗi tướng => 85 lá, xáo 1 lần
        const list = decks[side] && validateDeck(decks[side]) === null ? decks[side]! : DEFAULT_DECK
        for (const id of list) { const d = parseDeckCard(id); p.deck.push(g.supportCard(d.support === "spell" ? `spell_${d.spell}` : d.support,
            d.item)) }
        for (const h of teams[side]) p.deck.push(...g.heroCards(h,
            side))
        g.shuffle(p.deck)
        // lá thưởng úp: ngẫu nhiên từ thẻ hỗ trợ + thẻ chiêu chung, không lấy từ bộ bài chính
        for (let i = 0; i < RULES.prizeCount; i++) {
            const id = PRIZE_POOL[g.randInt(PRIZE_POOL.length)]
            s.prizeCards[side].push(g.supportCard(id))
        }
        s.prizes[side] = s.prizeCards[side].length
    }
    g.emit({
        t: "roundStart", round: 1, openLanes: g.openLanes()
    })
    // tay đầu rút NGAY (trước bước gọi tướng): bài trên tay quyết định gọi tướng nào
    s.opened = {
        A: true, B: true
    }
    // bên đi sau được bù thêm lá (RULES.secondPlayerBonus)
    for (const side of SIDES) g.draw(side,
        RULES.startHand + (side === s.active ? 0 : RULES.secondPlayerBonus),
        {
            reason: "opening"
        })
    beginRound(g)
    return {
        state: s, events: g.events
    }
}
export const newGame = (seed: number, teamA: string[], teamB: string[]) => newGameEx(seed,
    teamA,
    teamB).state

const previewCache = new Map<string, { g: Game; u: Unit }>()
/** Tướng mẫu (chỉ số gốc, chưa đồ, đang trên sân) để tính công thức khi chưa vào trận (màn cấm/chọn) */
export function previewUnit(hero: string): { g: Game; u: Unit } | undefined {
    const hit = previewCache.get(hero)
    if (hit) return hit
    if (!getHero(hero)) return undefined
    const others = implementedHeroes().map((h) => h.id).filter((id) => id !== hero)
    const s = newGame(1,
        [hero,
            ...others.slice(0,
                4)],
        others.slice(4,
            9))
    const u = s.units[`A:${hero}`]
    if (!u) return undefined
    u.status = "board"
    const out = {
        g: new Game(s), u
    }
    previewCache.set(hero,
        out)
    return out
}
const PRIZE_POOL = ["basic",
    "basic",
    "gold",
    "item",
    "draw",
    "spell_heal",
    "spell_barrier",
    "spell_flash",
    "spell_cleanse"]

// ======================================================================
// Tra cứu lá
// ======================================================================
const isOver = (g: Game) => g.s.phase === "over"
const keyOf = (id: string): SkillKey => id.slice(-1).toUpperCase() as SkillKey
const sig = (c: Card) => `${c.kind}|${c.id}|${c.hero ?? ""}|${c.item ?? ""}|${c.copyOf ?? ""}`

/** Chiêu mà lá chiêu/lá Bóng này tung (thẻ chiêu chung "wild" đã bỏ khỏi chế độ; tham số wildHero giữ để tương thích) */
/** Lá đặc biệt do tướng tạo mà đánh được như chiêu (SpecialCardDef.skill) */
const specialSkill = (card: Card): SkillDef | undefined => (card.kind === "special" ? getSpecialCard(card.id)?.skill : undefined)
/** Lá đánh được như một chiêu: lá chiêu, lá Bóng (copyOf) hoặc lá đặc biệt có SpecialCardDef.skill */
const isSkillLike = (card: Card) => card.kind === "skill" || !!card.copyOf || !!specialSkill(card)
export function skillOfCard(card: Card, wildHero?: string): SkillDef | undefined {
    if (card.kind === "wild") return wildHero ? getHero(wildHero)?.skills[keyOf(card.id)] : undefined
    const sp = specialSkill(card)
    if (sp) return sp
    if (card.kind !== "skill" && !card.copyOf) return undefined
    return card.hero ? getHero(card.hero)?.skills[keyOf(card.copyOf ?? card.id)] : undefined
}
const heroUnitOfCard = (g: Game, card: Card, side: Side) => (isSkillLike(card) ? g.unit(`${card.side ?? side}:${card.hero}`) : undefined)

function tauntFilter(g: Game, side: Side, list0: Unit[]): Unit[] {
    // Tàng hình (stealth) / đóng băng bản thân (stasis): không bị chọn làm mục tiêu đơn / tối đa N / đòn đánh (chiêu mọi tướng, nổ, DoT vẫn trúng stealth)
    const list = list0.filter((u) => g.targetable(u))
    const taunters = list.filter((u) => g.has(u,
        "taunt"))
    // taunt nằm trên tướng bất kỳ của phe địch: nếu có, mọi lá đơn mục tiêu phải nhắm tướng đó
    const any = g.enemies(side).filter((u) => g.has(u,
        "taunt"))
    return any.length ? taunters : list
}

/** Mục tiêu hợp lệ của đòn đánh thường theo luật vai. viaCard=true: áp khiêu khích của đỡ đòn lên xạ thủ. */
export function attackTargets(g: Game, a: Unit, viaCard: boolean): Unit[] {
    const role = g.role(a)
    let list: Unit[]
    const any = hasAnyTarget(a) // Đại Bác Liên Thanh: đánh được mọi tướng địch, không bị ép đánh Đỡ Đòn
    if (role === "marksman" || any) {
        list = g.enemies(a) // xạ thủ: mọi tướng địch, kể cả vật triệu hồi ở ô phụ (luật: chỉ đòn đánh của xạ thủ nhắm được token)
        // khiêu khích của đỡ đòn: lá Đánh thường phải đánh đỡ đòn — nhưng token ở ô phụ vẫn nhắm được (không phải tướng)
        if (viaCard && !any) { const tanks = list.filter((u) => !u.token && g.role(u) === "tank"); if (tanks.length) list = [...tanks,
            ...list.filter((u) => u.token)] }
    } else {
        const o = g.opposite(a)
        list = o ? [o] : []
    }
    // Ô phụ (Thùng, Thiếu Nữ, token khác): Xạ thủ VÀ Đấu sĩ đánh được (Đấu sĩ chỉ đánh kẻ đối diện + ô phụ); vai khác không
    const base0 = tauntFilter(g,
        a.side,
        list)
    const base = [...base0]
    if (role === "fighter" && !a.token) for (const t of g.enemies(a)) if (t.token && !base.includes(t)) base.push(t)
    // mục tiêu thêm của tướng (HeroDef.extraAttackTargets: Thùng của chính mình cho Gangplank), không qua khiêu khích
    const extra = a.token ? [] : getHero(a.hero)?.extraAttackTargets?.(g,
        a) ?? []
    return [...base,
        ...extra.filter((x) => x.status === "board" && !base.some((b) => b.id === x.id))]
}

function subsets(list: Unit[], max: number, mustInclude: Unit[]): PlayArgs[] {
    const out: PlayArgs[] = []
    const n = list.length
    for (let mask = 1; mask < 1 << n; mask++) {
        const pick = list.filter((_, i) => mask & (1 << i))
        if (pick.length > max) continue
        if (mustInclude.length && !pick.some((u) => mustInclude.some((m) => m.id === u.id))) continue
        out.push({
            targets: pick.map((u) => u.id)
        })
    }
    return out.length ? out : [{
        targets: []
    }]
}
function targetValues(g: Game, side: Side, self: Unit, k: TargetKind, max: number, tokens = false): PlayArgs[] {
    const foes = g.enemies(self).filter((u) => tokens || !u.token) // chiêu không nhắm được token trừ khi SkillDef.targetsTokens
    const taunters = g.enemies(side).filter((u) => g.has(u,
        "taunt"))
    switch (k) {
    case "none": case "self": case "all_enemies": case "all_allies": return [{
    }]
    case "opposite": { const o = g.opposite(self); return o && g.targetable(o) ? [{
    }] : [] }
    case "enemy": return tauntFilter(g,
        side,
        foes).map((u) => ({
        target: u.id
    }))
    case "ally": return g.allies(self).map((u) => ({
        target: u.id
    }))
    case "ally_other": return g.allies(self,
        false).map((u) => ({
        target: u.id
    }))
    case "enemies_upto": return subsets(foes.filter((u) => !g.has(u,
        "stealth")),
    max,
    taunters)
    case "allies_upto": return subsets(g.allies(self),
        max,
        [])
    case "lane": return g.openLanes().map((l) => ({
        lane: l
    }))
    }
}
/** Liệt kê PlayArgs hợp lệ của một chiêu (rỗng = không đánh được) */
export function skillArgs(g: Game, side: Side, self: Unit, card: Card, def: SkillDef, trigger?: Trigger): PlayArgs[] {
    const oc: OptCtx = {
        g, side, self, card, trigger
    }
    if (def.canPlay && !def.canPlay(oc)) return []
    if (def.options) return def.options(oc)
    if (def.chainOnly) return [{
    }]
    let combos: PlayArgs[] = [{
    }]
    for (const k of Array.isArray(def.target) ? def.target : [def.target]) {
        const vals = targetValues(g,
            side,
            self,
            k,
            def.max ?? 1,
            !!def.targetsTokens)
        combos = combos.flatMap((a) => vals.map((v) => ({
            ...a, ...v
        })))
    }
    if (def.extra === "color") combos = combos.flatMap((a) => (["blue",
        "red",
        "gold"] as const).map((color) => ({
        ...a, color
    })))
    if (def.extra === "discard") {
        const seen = new Set<string>()
        if ((def.discardMax ?? 1) > 1) { // bỏ tối đa N lá: mọi tổ hợp 1..N lá (gộp lá giống nhau)
            const pool = g.player(side).hand.filter((c) => c.uid !== card.uid)
            const subs: string[][] = []
            const keys = new Set<string>()
            const rec = (start: number, cur: Card[]) => {
                if (cur.length) {
                    const k = cur.map(sig).sort().join("|")
                    if (!keys.has(k)) { keys.add(k); subs.push(cur.map((c) => c.uid)) }
                }
                if (cur.length >= def.discardMax!) return
                for (let i = start; i < pool.length; i++) rec(i + 1,
                    [...cur,
                        pool[i]])
            }
            rec(0,
                [])
            combos = subs.length ? combos.flatMap((a) => subs.map((d) => ({
                ...a, discard: d
            }))) : combos.map((a) => ({
                ...a, discard: []
            }))
            return combos
        }
        const others = g.player(side).hand.filter((c) => c.uid !== card.uid && !seen.has(sig(c)) && !!seen.add(sig(c)))
        combos = others.length ? combos.flatMap((a) => others.map((c) => ({
            ...a, discard: [c.uid]
        }))) : combos.map((a) => ({
            ...a, discard: []
        }))
    }
    return combos
}

const supportAllies = (g: Game, side: Side) => g.board(side)
/** Cách dùng thêm lá trên tay do tướng cho phép (HeroDef.handUse) mà `card` dùng được */
function handUseOf(g: Game, side: Side, card: Card, id?: string) {
    for (const u of g.heroes(side)) {
        const hu = getHero(u.hero)?.handUse
        if (hu && (id === undefined || hu.id === id) && hu.can(g,
            u,
            card)) return {
            u, hu
        }
    }
    return undefined
}
/** Mọi PlayArgs hợp lệ để đánh lá `card` (không tính phản ứng), kèm cách dùng thêm của tướng (HeroDef.handUse) */
export function playOptions(g: Game, side: Side, card: Card): PlayArgs[] {
    const out = playOptionsBase(g,
        side,
        card)
    if (isOver(g) || card.frozen) return out
    for (const u of g.heroes(side)) {
        const hu = getHero(u.hero)?.handUse
        if (hu && hu.can(g,
            u,
            card)) out.push({
            pick: hu.id
        })
    }
    return out
}
function playOptionsBase(g: Game, side: Side, card: Card): PlayArgs[] {
    const p = g.player(side)
    if (isOver(g) || card.frozen) return [] // lá Hoá Băng không đánh được
    if (card.kind === "support") {
        switch (card.id) {
        case "basic": {
            const out: PlayArgs[] = []
            if (g.attacksLeft(side) <= 0) return out
            for (const a of g.board(side)) {
                if (!g.canAttack(a) || (a.token && g.role(a) === "fighter")) continue
                for (const t of attackTargets(g,
                    a,
                    true)) out.push({
                    actor: a.id, target: t.id
                })
            }
            return out
        }
        case "potion": return supportAllies(g,
            side).map((u) => ({
            target: u.id
        }))
        case "buff": return supportAllies(g,
            side).map((u) => ({
            target: u.id
        }))
        case "draw": return [{
        }]
        case "item": return card.item ? g.heroes(side).filter((u) => u.items.length < RULES.itemSlots).map((u) => ({
            target: u.id
        })) : [] // đeo riêng 1 mảnh vào ô (sau đó ghép tại chỗ bằng action upgrade)
        case "mana": return g.heroes(side).filter((u) => g.isMage(u) && g.manaOf(u) < g.maxMana(u)).map((u) => ({
            target: u.id
        }))
        case "legend": return g.heroes(side).filter((u) => u.items.length < RULES.itemSlots).map((u) => ({
            target: u.id
        }))
        default: { const sp = spellOf(card.id); return sp ? spellOptions(g,
            side,
            sp) : [] } // gold/item chỉ dùng qua ghép đồ
        }
    }
    if (isSkillLike(card)) {
        const u = heroUnitOfCard(g,
            card,
            side)
        const def = skillOfCard(card)
        if (!u || !def || u.side !== side || !g.canCast(u) || def.chainOnly) return []
        if (g.isMage(u) && g.manaOf(u) < g.manaCost(u,
            def,
            card)) return []
        return skillArgs(g,
            side,
            u,
            card,
            def)
    }
    void p
    return []
}

/** Lá Quick + tham số có thể nối lên mắt xích mô tả bởi `trigger` */
export function chainOptions(g: Game, side: Side, trigger: Trigger): { card: Card; args: PlayArgs }[] {
    const out: { card: Card; args: PlayArgs }[] = []
    const seen = new Set<string>()
    const add = (card: Card, u: Unit, def: SkillDef, actor?: string) => {
        if (!def.quick || !g.canCast(u)) return
        if (g.isMage(u) && g.manaOf(u) < g.manaCost(u,
            def,
            card)) return
        if (def.quickWhen && !def.quickWhen({
            g, side, self: u, card, trigger
        })) return
        for (const args of skillArgs(g,
            side,
            u,
            card,
            def,
            trigger)) out.push({
            card, args: actor ? {
                ...args, actor
            } : args
        })
    }
    for (const card of g.player(side).hand) {
        if (card.frozen || seen.has(sig(card))) continue
        seen.add(sig(card))
        if (isSkillLike(card)) {
            const def = skillOfCard(card), u = heroUnitOfCard(g,
                card,
                side)
            if (def && u && u.side === side) add(card,
                u,
                def)
        }
    }
    return out
}

// ======================================================================
// Hành động hợp lệ
// ======================================================================

export function legalActions(state: GameState, side: Side): Action[] {
    const g = new Game(state)
    const s = state
    if (s.phase === "over") return []
    if (s.phase === "blind") return blindActions(g,
        side)
    if (s.phase === "chain" && s.chain) {
        if (s.chain.priority !== side) return []
        const out: Action[] = chainChoices(g,
            side).map((r) => ({
            t: "chain" as const, side, uid: r.card.uid, args: r.args
        }))
        out.push({
            t: "pass", side
        })
        return out
    }
    if (s.active !== side || s.phase !== "main") return []
    const out: Action[] = []
    if (s.actionsThisTurn < RULES.maxActionsPerTurn) {
        // đánh lá
        const seen = new Set<string>()
        for (const card of s.players[side].hand) {
            if (seen.has(sig(card))) continue
            seen.add(sig(card))
            for (const args of playOptions(g,
                side,
                card)) out.push({
                t: "play", side, uid: card.uid, args
            })
        }
        // đòn miễn phí nhờ buff (vẫn tính vào giới hạn 3 đòn)
        if (g.attacksLeft(side) > 0) for (const a of g.board(side)) {
            if (!g.canAttack(a) || !a.nextAttack.some((b) => b.free)) continue
            for (const t of attackTargets(g,
                a,
                false)) out.push({
                t: "attack", side, actor: a.id, target: t.id
            })
        }
        // đòn không cần lá của Đấu sĩ (Quick, 66%)
        for (const a of g.heroes(side)) if (g.canCardless(a)) for (const t of attackTargets(g,
            a,
            false)) out.push({
            t: "attack", side, actor: a.id, target: t.id, cardless: true
        })
        // tháo đồ (V3): lá đồ về tay (tay đầy thì đốt)
        for (const u of g.heroes(side)) for (const item of new Set(u.items)) out.push({
            t: "unequip", side, unit: u.id, item
        })
        // ghép tại chỗ: tướng đang mang 1 mảnh + 1 mảnh trên tay + 1 Vàng
        {
            const hd = s.players[side].hand
            const gold1 = hd.find((c) => c.kind === "support" && c.id === "gold" && !c.frozen)
            if (gold1) {
                const seenUp = new Set<string>()
                for (const u of g.heroes(side)) for (const from of new Set(u.items)) {
                    if (!(COMPONENTS as readonly string[]).includes(from)) continue
                    for (const c of hd) {
                        if (c.kind !== "support" || c.id !== "item" || c.frozen || !c.item) continue
                        const key = `${u.id}|${from}|${c.item}`
                        const res = cardCombine(from,
                            c.item)
                        if (seenUp.has(key) || !res || !CARD_ITEMS[res]) continue
                        seenUp.add(key)
                        out.push({
                            t: "upgrade", side, unit: u.id, item: c.uid, gold: gold1.uid
                        })
                    }
                }
            }
        }
        // ghép đồ
        const hand = s.players[side].hand
        const items = hand.filter((c) => c.kind === "support" && c.id === "item" && !c.frozen)
        const gold = hand.find((c) => c.kind === "support" && c.id === "gold" && !c.frozen)
        if (gold && items.length >= 2) {
            const pairs = new Set<string>()
            for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
                const k = [items[i].item,
                    items[j].item].sort().join("+")
                if (pairs.has(k) || !cardCombine(items[i].item!,
items[j].item!)) continue
                pairs.add(k)
                out.push({
                    t: "craft", side, items: [items[i].uid,
                        items[j].uid], gold: gold.uid
                })
            }
        }
    }
    // bỏ bài xuống mộ: miễn phí, không giới hạn số lần, không tính vào giới hạn hành động; lá tạm/đặc biệt không bỏ được
    for (const c of s.players[side].hand) if (canDiscardManually(c)) out.push({
        t: "discard", side, uid: c.uid
    })
    out.push({
        t: "end", side
    })
    return out
}

// ======================================================================
// Áp hành động
// ======================================================================
export function applyAction(state: GameState, action: Action): { state: GameState; events: GameEvent[] } {
    const s = cloneDeep(state)
    const g = new Game(s)
    if (s.phase === "over") throw new Error("Trận đã kết thúc")
    if (s.phase === "blind") {
        applyBlind(g,
            action)
        return {
            state: s, events: g.events
        }
    }
    if (s.phase === "chain" && s.chain) {
        const ch = s.chain
        if (action.side !== ch.priority || (action.t !== "chain" && action.t !== "pass")) throw new Error("Đang chờ nối chuỗi")
        if (action.t === "chain") addQuickLink(g,
            action)
        else { g.emit({
            t: "pass", side: action.side
        }); ch.passes++; ch.priority = otherSide(ch.priority) }
        advanceChain(g)
        return {
            state: s, events: g.events
        }
    }
    if (action.side !== s.active) throw new Error("Chưa tới lượt")
    if (s.phase !== "main") throw new Error("Không đúng bước chơi")
    s.actionsThisTurn++
    switch (action.t) {
    case "play": {
        const card = s.players[action.side].hand.find((c) => c.uid === action.uid)
        if (!card) throw new Error("Không có lá này trên tay")
        const args = action.args ?? {
        }
        if (!playOptions(g,
            action.side,
            card).some((o) => Game.argsKey(o) === Game.argsKey(args))) throw new Error(`Lá ${card.id} không đánh được với tham số này`)
        const use = args.pick ? handUseOf(g,
            action.side,
            card,
            args.pick) : undefined
        if (use) { // hành động tay của tướng: lá rời tay, giải quyết ngay (không qua Chuỗi, không lộ lá)
            removeFromHand(g,
                action.side,
                card)
            use.hu.resolve(g,
                use.u,
                card)
            break
        }
        removeFromHand(g,
            action.side,
            card)
        s.stats[action.side].cardsPlayed++
        if (card.kind === "support" && card.id === "basic") g.countAttack(action.side)
        const manaPaid = payMana(g,
            action.side,
            card)
        g.emit({
            t: "play", side: action.side, card, args
        })
        startChain(g,
            action.side,
            "card",
            card,
            args,
            undefined,
            manaPaid)
        break
    }
    case "attack": {
        const a = g.unit(action.actor), t = g.unit(action.target)
        if (!a || !t || a.side !== action.side || !g.canAttack(a) || !attackTargets(g,
            a,
            false).some((x) => x.id === t.id)) throw new Error("Đòn đánh không hợp lệ")
        if (action.cardless) {
            if (!g.canCardless(a)) throw new Error("Không đánh không cần lá được")
            g.turnAttacks(a.side).cardless.push(a.id)
        } else if (!a.nextAttack.some((b) => b.free) || g.attacksLeft(action.side) <= 0) throw new Error("Đòn đánh miễn phí không hợp lệ")
        g.countAttack(action.side)
        startChain(g,
            action.side,
            "attack",
            undefined,
            {
                actor: a.id, target: t.id
            },
            action.cardless ? "cardless" : "free")
        break
    }
    case "unequip": {
        const u = g.unit(action.unit)
        if (!u || u.side !== action.side || u.status !== "board" || u.token || !u.items.includes(action.item)) throw new Error("Không tháo được món này")
        g.unequip(u,
            action.item)
        break
    }
    case "discard": {
        const card = s.players[action.side].hand.find((c) => c.uid === action.uid)
        if (!card) throw new Error("Không có lá này trên tay")
        if (!canDiscardManually(card)) throw new Error("Lá tạm/đặc biệt không bỏ xuống mộ được")
        s.actionsThisTurn-- // bỏ bài miễn phí
        g.discard(action.side,
            action.uid,
            "manual")
        break
    }
    case "craft": doCraft(g,
        action); break
    case "upgrade": doUpgrade(g,
        action); break
    case "end": endTurn(g); break
    default: throw new Error("Hành động không hợp lệ ở lượt này (gọi tướng chỉ ở bước gọi tướng úp)")
    }
    return {
        state: s, events: g.events
    }
}

/** Lá được phép bỏ tay xuống mộ: lá tạm / lá đặc biệt sẽ biến mất nên không cho bỏ. Lá đóng băng vẫn bỏ được (lối thoát khỏi băng). */
export function canDiscardManually(card: Card): boolean {
    return !card.temp && card.kind !== "special"
}

function removeFromHand(g: Game, side: Side, card: Card) {
    const h = g.player(side).hand
    h.splice(h.findIndex((c) => c.uid === card.uid),
        1)
}

/** Chiêu của pháp sư: trả mana khi kích hoạt (không hoàn lại nếu lá bị huỷ/đổi hướng). Trả về mana đã trả (0 với lá khác). */
function payMana(g: Game, side: Side, card: Card): number {
    if (!isSkillLike(card)) return 0
    const u = heroUnitOfCard(g,
            card,
            side), def = skillOfCard(card)
    if (!u || !def || !g.isMage(u)) return 0
    const cost = g.manaCost(u,
        def,
        card)
    if (!g.spendMana(u,
        cost,
        card)) throw new Error("Không đủ mana")
    return cost
}

// ======================================================================
// Bước GỌI TƯỚNG ÚP đồng thời (đầu mỗi vòng, trước lượt của A)
// ======================================================================
/** Lựa chọn gọi tướng của side lúc này, trừ các lựa chọn úp đã chọn (mỗi tướng/đường một lần) */
function blindOptions(g: Game, side: Side): Extract<Action, { t: "summon" }>[] {
    const b = g.s.blind
    if (!b || b.ready[side] || b.picks[side].length >= b.cap) return []
    if (!RULES.summonRounds.includes(g.s.round)) return [] // V3: chỉ gọi tướng ở các mốc RULES.summonRounds
    const out: Extract<Action, { t: "summon" }>[] = []
    const taken = b.picks[side]
    for (const h of g.s.players[side].heroes) {
        const u = g.s.units[`${side}:${h}`]
        if (!u || u.status !== "reserve" || taken.some((x) => x.hero === h)) continue
        const def = getHero(h)!
        const lanes = def.summonLanes ? def.summonLanes(g,
            side) : g.emptyLanes(side)
        for (const lane of lanes) if (!taken.some((x) => x.lane === lane)) out.push({
            t: "summon", side, hero: h, lane
        })
    }
    return out
}
/** Bên chưa có tướng nào trên sân và còn tướng gọi được thì bắt buộc gọi ít nhất 1 */
const blindMustPick = (g: Game, side: Side) => !g.s.blind!.picks[side].length && !g.heroes(side).length && blindOptions(g,
    side).length > 0
function blindActions(g: Game, side: Side): Action[] {
    const b = g.s.blind
    if (!b || b.ready[side]) return []
    const out: Action[] = blindOptions(g,
        side)
    if (!blindMustPick(g,
        side)) out.push({
        t: "ready", side
    })
    return out
}
/** Phe nào đang được phép hành động (blind: mọi phe chưa chốt; chain: bên có quyền; còn lại: phe có lượt) */
export function actorsOf(state: GameState): Side[] {
    if (state.phase === "over") return []
    if (state.phase === "blind") return SIDES.filter((x) => !state.blind?.ready[x])
    if (state.phase === "chain" && state.chain) return [state.chain.priority]
    return [state.active]
}
function lockBlind(g: Game, side: Side) {
    const b = g.s.blind!
    b.ready[side] = true
    g.emit({
        t: "blindLocked", side
    })
    if (!b.ready.A || !b.ready.B) return
    // lật cùng lúc: đặt tướng của A rồi B (thứ tự chỉ để phát sự kiện)
    g.s.blind = undefined
    g.s.phase = "main"
    for (const sd of SIDES) for (const pk of b.picks[sd]) {
        const u = g.s.units[`${sd}:${pk.hero}`]
        if (u && u.status === "reserve") g.summon(sd,
            pk.hero,
            pk.lane)
    }
    if (!isOver(g)) beginTurn(g)
}
function applyBlind(g: Game, action: Action) {
    const b = g.s.blind
    if (!b || (action.t !== "summon" && action.t !== "ready")) throw new Error("Đang ở bước gọi tướng úp: chọn tướng (summon) hoặc chốt (ready)")
    if (b.ready[action.side]) throw new Error("Đã chốt gọi tướng")
    if (action.t === "ready") {
        if (blindMustPick(g,
            action.side)) throw new Error("Phải gọi ít nhất 1 tướng")
        lockBlind(g,
            action.side)
        return
    }
    if (!blindOptions(g,
        action.side).some((o) => o.hero === action.hero && o.lane === action.lane)) throw new Error("Không gọi được tướng/đường này")
    b.picks[action.side].push({
        hero: action.hero, lane: action.lane
    })
    if (b.picks[action.side].length >= b.cap || !blindOptions(g,
        action.side).length) lockBlind(g,
        action.side)
}
/** Đầu vòng: mở bước gọi tướng úp nếu có bên nào gọi được, ngược lại vào thẳng lượt */
function beginRound(g: Game) {
    const s = g.s
    const opened = [0,
        1,
        2,
        3,
        4].filter((l) => RULES.laneOpenRound[l] === s.round).length
    const cap = Math.max(1,
        opened)
    s.blind = {
        cap, picks: {
            A: [], B: []
        }, ready: {
            A: false, B: false
        }
    }
    const can = SIDES.filter((x) => blindOptions(g,
        x).length > 0)
    if (!can.length) { s.blind = undefined; beginTurn(g); return }
    for (const x of SIDES) if (!can.includes(x)) s.blind.ready[x] = true
    s.phase = "blind"
    g.emit({
        t: "blindStart", round: s.round, cap
    })
}

// ======================================================================
// Chuỗi (Chain) kiểu Yu-Gi-Oh: lá gốc là mắt xích 1, hai bên lần lượt nối lá Quick hoặc bỏ qua;
// hai lần bỏ qua liên tiếp thì giải quyết từ mắt xích cuối về đầu.
// ======================================================================
/** Mô tả mắt xích: nhắm ai, nhắm đơn hay nhiều, chiêu cuối, có thể đổi mục tiêu sang ai */
function describeLink(g: Game, side: Side, card: Card | undefined, args: PlayArgs): { trigger: Trigger; targets: string[] } {
    const foe = otherSide(side)
    const isAttack = !card
    const caster = isAttack || card.kind === "support" ? g.unit(args.actor) : heroUnitOfCard(g,
        card,
        side)
    const def = card ? skillOfCard(card,
        caster?.hero) : undefined
    const kinds = def ? (Array.isArray(def.target) ? def.target : [def.target]) : []
    const allEnemies = kinds.includes("all_enemies")
    let ids: string[]
    if (isAttack) ids = args.target ? [args.target] : []
    else if (allEnemies) ids = g.enemies(side).map((u) => u.id)
    else if (kinds.includes("opposite")) { const o = caster ? g.opposite(caster) : undefined; ids = o ? [o.id] : [] }
    else ids = [...(args.target ? [args.target] : []),
        ...(args.targets ?? [])]
    const hit = ids.map((id) => g.unit(id)).filter((u): u is Unit => !!u && u.side === foe && u.status === "board")
    let redirectable: string[] = []
    if (hit.length) {
        if (def) redirectable = (kinds.includes("enemy") ? tauntFilter(g,
            side,
            g.enemies(side)) : g.enemies(side)).map((u) => u.id)
        else if (caster) redirectable = attackTargets(g,
            caster,
            card?.id === "basic").map((u) => u.id)
    }
    const trigger: Trigger = {
        side, card: card as Card, actor: caster?.id, target: hit[0]?.id ?? "",
        single: !allEnemies && hit.length === 1,
        multi: hit.length > 0 && (allEnemies || kinds.includes("enemies_upto")),
        ult: def?.key === "R",
        redirectable,
    }
    return {
        trigger, targets: ids
    }
}

/** Lá Quick bên `side` nối được lên mắt xích trên cùng (rỗng nếu chuỗi đã đủ dài) */
function chainChoices(g: Game, side: Side) {
    const ch = g.s.chain
    if (!ch || ch.links.length >= RULES.maxChain) return []
    const top = ch.links[ch.links.length - 1]
    if (top.card && skillOfCard(top.card,
        g.unit(top.actor)?.hero)?.uncounterable) return [] // chiêu "không thể nối chuỗi" (Malphite R)
    return chainOptions(g,
        side,
        ch.links[ch.links.length - 1].trigger)
}

function startChain(g: Game, side: Side, kind: "card" | "attack", card: Card | undefined, args: PlayArgs, mode?: "free" | "cardless", manaPaid?: number) {
    const { trigger, targets } = describeLink(g,
        side,
        card,
        args)
    g.s.chain = {
        links: [{
            n: 1, side, kind, card, actor: trigger.actor, args, targets, trigger, quick: false, ...(mode ? {
                mode
            } : {
            }), ...(manaPaid ? {
                manaPaid
            } : {
            })
        }],
        priority: otherSide(side), passes: 0,
    }
    advanceChain(g)
}

function addQuickLink(g: Game, action: Extract<Action, { t: "chain" }>) {
    const ch = g.s.chain!
    const top = ch.links[ch.links.length - 1]
    const card = g.player(action.side).hand.find((c) => c.uid === action.uid)
    const args = action.args ?? {
    }
    if (!card || !chainChoices(g,
        action.side).some((r) => sig(r.card) === sig(card) && Game.argsKey(r.args) === Game.argsKey(args))) throw new Error("Không nối chuỗi được bằng lá này")
    removeFromHand(g,
        action.side,
        card)
    g.s.stats[action.side].cardsPlayed++
    const manaPaid = payMana(g,
        action.side,
        card)
    g.emit({
        t: "play", side: action.side, card, args, reaction: true
    })
    const { trigger, targets } = describeLink(g,
        action.side,
        card,
        args)
    const n = ch.links.length + 1
    ch.links.push({
        n, side: action.side, kind: "card", card, actor: trigger.actor, args, targets, trigger, quick: true, reactTo: top.trigger, ...(manaPaid ? {
            manaPaid
        } : {
        })
    })
    g.emit({
        t: "chainAdd", side: action.side, n, card, kind: "card", actor: trigger.actor, targets
    })
    ch.passes = 0
    ch.priority = otherSide(action.side)
}

/** Chuyển quyền cho bên kế tiếp; bên không có lá Quick nào thì tự bỏ qua. Hai lần bỏ qua liên tiếp: giải quyết. */
function advanceChain(g: Game) {
    const ch = g.s.chain!
    while (ch.passes < 2) {
        if (chainChoices(g,
            ch.priority).length) {
            if (!ch.opened) {
                const L = ch.links[0]
                ch.opened = true
                g.emit({
                    t: "chainAdd", side: L.side, n: 1, card: L.card, kind: L.kind, actor: L.actor, targets: L.targets
                })
            }
            g.s.phase = "chain"
            g.emit({
                t: "chainWindow", priority: ch.priority, length: ch.links.length
            })
            return
        }
        ch.passes++
        ch.priority = otherSide(ch.priority)
    }
    resolveChain(g)
}

function resolveChain(g: Game) {
    const ch = g.s.chain!
    g.s.chain = null
    g.s.phase = "main"
    let carry: ReactFx | undefined
    for (let i = ch.links.length - 1; i >= 0; i--) {
        if (isOver(g)) break
        const L = ch.links[i]
        g.s.fx = carry; g.s.fxNext = undefined
        if (ch.opened) g.emit({
            t: "chainResolve", n: L.n, side: L.side, card: L.card
        })
        resolveLink(g,
            L,
            !!ch.opened)
        carry = g.s.fxNext
        g.s.fx = undefined; g.s.fxNext = undefined
    }
    if (ch.opened) g.emit({
        t: "chainEnd", length: ch.links.length
    })
}

function resolveLink(g: Game, L: ChainLink, opened = false) {
    // Luật Chuỗi: mắt xích có người tung đang bị Choáng lúc tới lượt giải quyết thì bị huỷ (lá vẫn vào mộ như đã dùng)
    const caster = g.unit(L.actor)
    if (opened && caster && g.has(caster,
        "stun")) {
        g.emit({
            t: "log", text: `Chain Link ${L.n} fizzles: its caster is Stunned.`
        })
        if (L.card && L.card.kind !== "support" && L.card.kind !== "special" && !L.card.copyOf && !L.card.temp) g.player(L.side).grave.push(L.card)
        return
    }
    // fx.cancel (Janna Q, Soraka E, Blitz E): mắt xích này bị huỷ; lá vẫn coi là đã dùng (vào mộ), hoặc bị giật nếu fx.stealBy
    const cfx = g.s.fx
    if (cfx?.cancel) {
        g.emit({
            t: "chainCancel", n: L.n, side: L.side, card: L.card
        })
        if (L.card) {
            if (cfx.stealBy && cfx.stealBy !== L.side) g.stealFromChain(cfx.stealBy,
                L.side,
                L.card)
            else if (L.card.kind !== "support" && L.card.kind !== "special" && !L.card.copyOf && !L.card.temp) g.player(L.side).grave.push(L.card)
        }
        return
    }
    let args = L.args
    // Đổi mục tiêu (Braum Q) do mắt xích ngay trên tạo ra
    const rd = g.unit(g.s.fx?.redirect)
    if (rd && rd.status === "board" && rd.side !== L.side) {
        args = {
            ...args, target: rd.id
        }
        if (args.targets) args.targets = [rd.id]
    }
    if (L.kind === "attack") {
        const a = g.unit(args.actor), t = g.unit(args.target)
        const cardless = L.mode === "cardless"
        if (a && t && a.status === "board" && t.status === "board" && (t.side === a.side || g.targetable(t))) g.attack(a,
            t,
            cardless ? {
                cardless: true, mult: RULES.fighterCardlessMult
            } : {
                free: true
            })
    } else if (L.card) resolveCard(g,
        L.side,
        L.card,
        args,
        L.reactTo,
        L.manaPaid ?? 0)
}

// ======================================================================
// Giải quyết một lá
// ======================================================================
const SUPPORT_NAME: Record<string, string> = {
    basic: "Đánh thường", gold: "Vàng", item: "Đồ", potion: "Bình Máu", draw: "Rút Bài", buff: "Bổ Trợ", mana: "Hồi Mana"
}
const SUPPORT_DESC: Record<string, string> = {
    basic: "1 tướng mình đánh thường theo luật vai.",
    gold: "1 vàng: 2 Đồ + 1 Vàng ghép thành 1 món đồ; hoặc 1 Đồ + 1 Vàng ghép tại chỗ với mảnh tướng đang mang.",
    item: "Mảnh đồ: đánh lên 1 tướng mình để đeo riêng (chiếm 1 ô); 2 Đồ + 1 Vàng ghép thành 1 món đồ.",
    potion: `1 tướng mình hồi {${RULES.potion.base}} + ${pct(RULES.potion.pctMax)}% máu tối đa.`,
    draw: "Rút 2 lá.",
    mana: `1 pháp sư mình hồi {${RULES.mage.restoreCard}} mana.`,
    buff: `1 tướng mình +${pct(RULES.buffCard.dmg)}% sát thương và Khiên ${RULES.buffCard.shield} tới hết lượt đối thủ.`,
}

function resolveCard(g: Game, side: Side, card: Card, args: PlayArgs, trigger?: Trigger, manaPaid = 0) {
    const prevCur = g.cur
    try { resolveCardInner(g,
        side,
        card,
        args,
        trigger,
        manaPaid) } finally { g.cur = prevCur }
}
function resolveCardInner(g: Game, side: Side, card: Card, args: PlayArgs, trigger?: Trigger, manaPaid = 0) {
    let dest = "grave" as "grave" | "hand" | "vanish"
    if (card.kind === "support") {
        dest = "vanish"
        g.cur = {
            src: args.actor, card: card.id
        }
        const tgt = g.unit(args.target)
        switch (card.id) {
        case "basic": {
            const a = g.unit(args.actor)
            if (a && tgt && g.canAttack(a) && tgt.status === "board" && (tgt.side === a.side || g.targetable(tgt))) g.attack(a,
                tgt)
            break
        }
        case "potion": if (tgt) g.heal(undefined,
            tgt,
            RULES.potion.base + RULES.potion.pctMax * tgt.maxHp); break
        case "buff": if (tgt) { g.status(tgt,
            "empower",
            1,
            {
                of: otherSide(side)
            }); g.shield(undefined,
            tgt,
            RULES.buffCard.shield) } break
        case "draw": g.draw(side,
            2,
            {
                reason: "card"
            }); break
        case "item": if (tgt && card.item && tgt.side === side && tgt.status === "board") g.equip(tgt,
            card.item); break
        case "mana": if (tgt && g.isMage(tgt) && tgt.side === side) g.gainMana(tgt,
            RULES.mage.restoreCard,
            "restore"); break
        case "legend": if (tgt && card.item && tgt.side === side && tgt.status === "board") g.equip(tgt,
            card.item); break
        default: { const sp = spellOf(card.id); if (sp) resolveSpell(g,
            side,
            sp,
            args) }
        }
        g.hook("onPlay",
            {
                side, card
            })
    } else if (isSkillLike(card)) {
        const self = heroUnitOfCard(g,
            card,
            side)
        const def = skillOfCard(card)
        if (card.copyOf || card.temp || card.kind === "special") dest = "vanish"
        if (self && def && self.side === side) {
            const kinds0 = Array.isArray(def.target) ? def.target : [def.target]
            const redirected = kinds0.includes("opposite") && args.target && g.unit(args.target)?.side !== side ? g.unit(args.target) : undefined // Braum Q đổi mục tiêu chiêu "đối diện"
            const target = trigger && def.chainOnly ? g.unit(trigger.target) : kinds0.includes("opposite") ? redirected ?? g.opposite(self) : g.unit(args.target)
            // mục tiêu địch đã Tàng Hình/đóng băng trong lúc chờ Chuỗi: chiêu trượt (không chọn được nữa)
            const lost = (u: Unit | undefined) => !!u && u.side !== self.side && !g.targetable(u)
            const picked = kinds0.includes("opposite") ? (target ? [target] : []) : (args.targets ?? (args.target ? [args.target] : [])).map((id) => g.unit(id)).filter((u): u is Unit => !!u && u.status === "board" && !lost(u))
            const targets = trigger && def.chainOnly ? (target ? [target] : []) : picked
            const kinds = Array.isArray(def.target) ? def.target : [def.target]
            const needsTarget = !def.chainOnly && kinds.some((k) => k === "opposite" || k === "enemy" || k === "ally" || k === "ally_other")
            const needsAny = !def.chainOnly && kinds.some((k) => k === "enemies_upto" || k === "allies_upto") && (args.targets?.length ?? 0) > 0
            if (!(needsTarget && (!target || target.status !== "board" || lost(target))) && !(needsAny && !targets.length) && self.status === "board") {
                const ctx: Ctx = {
                    g, self, side, card, args, target, targets, lane: args.lane, trigger, manaPaid,
                    f: (expr) => g.f(self,
                        expr),
                    toHand: () => { dest = "hand" },
                    vanish: () => { dest = "vanish" },
                }
                g.cur = {
                    src: self.id, card: `${self.hero}_${def.key.toLowerCase()}`, uid: card.uid
                }
                g.emit({
                    t: "cast", unit: self.id, skill: def.key, target: target?.id
                })
                // hook onTargeted: đồ/tướng địch có thể miễn hiệu ứng của lá này (Mũ Thích Nghi)
                const affected = (kinds.includes("all_enemies") ? g.enemies(self) : targets).filter((x) => x.side !== self.side && !x.token).map((x) => x.id)
                if (affected.length) {
                    const td = {
                        src: self, card, skill: def, affected, immune: [] as string[]
                    }
                    g.hook("onTargeted",
                        td)
                    g.s.immune = td.immune.length ? td.immune : undefined
                }
                g.hook("onPlay",
                    {
                        side, card, unit: self
                    })
                try { def.resolve(ctx) } finally { g.s.immune = undefined }
                g.hook("onCast",
                    {
                        caster: self, card, skill: def, target
                    })
            }
        }
    }
    // lá đi đâu sau khi dùng
    if (dest === "grave") g.player(side).grave.push(card)
    else if (dest === "hand") { g.emit({
        t: "returnToHand", side, card
    }); g.giveCard(side,
        card,
        "hand") }
}

const STAT_VI: Record<string, string> = {
    atk: "AD", ap: "AP", hp: "Máu", armor: "Giáp", mr: "Kháng phép", crit: "Chí mạng", critDmg: "ST chí mạng", atkMult: "% AD",
    lethality: "Sát lực", magicPen: "Xuyên phép", spellAmp: "% ST chiêu", dmgAmp: "% ST", lifesteal: "Hút máu", omnivamp: "Hút máu toàn phần", extraAtk: "% sát thương đòn đánh",
}
/** Chỉ số gốc của món đồ dạng chữ: "+40 AD, +20% Chí mạng" (dùng cho lá đồ huyền thoại) */
export function itemStatText(it: NonNullable<ReturnType<typeof getItem>>, names: Record<string, string> = STAT_VI): string {
    const b = cardItemStats(it)
    return Object.entries(names).filter(([k]) => b[k]).map(([k,
        n]) => (Math.abs(b[k]) < 1 && k !== "manaRegen" ? `+${Math.round(b[k] * 100)}% ${n}` : `+${Math.round(k === "manaRegen" ? b[k] * RULES.manaRegenToAp : b[k])} ${n}`)).join(", ")
}

/** Ghép tại chỗ: mảnh trong ô của tướng + mảnh trên tay + Vàng => món theo bảng ghép, thay đúng ô đó */
function doUpgrade(g: Game, a: Extract<Action, { t: "upgrade" }>) {
    const hand = g.player(a.side).hand
    const c = hand.find((x) => x.uid === a.item), gold = hand.find((x) => x.uid === a.gold), u = g.unit(a.unit)
    if (!c || !gold || !u || u.side !== a.side || u.status !== "board" || u.token) throw new Error("Ghép tại chỗ không hợp lệ")
    if (c.kind !== "support" || c.id !== "item" || !c.item || gold.id !== "gold" || c.frozen || gold.frozen) throw new Error("Cần 1 Đồ + 1 Vàng")
    const from = u.items.find((id) => (COMPONENTS as readonly string[]).includes(id) && !!cardCombine(id,
        c.item!))
    const result = from ? cardCombine(from,
        c.item) : undefined
    if (!from || !result || !CARD_ITEMS[result]) throw new Error("Không ghép được")
    removeFromHand(g,
        a.side,
        c)
    removeFromHand(g,
        a.side,
        gold)
    g.upgradeItem(u,
        from,
        result)
}

function doCraft(g: Game, a: Extract<Action, { t: "craft" }>) {
    const hand = g.player(a.side).hand
    const c1 = hand.find((c) => c.uid === a.items[0]), c2 = hand.find((c) => c.uid === a.items[1]), gold = hand.find((c) => c.uid === a.gold)
    if (!c1 || !c2 || c1.uid === c2.uid || !gold) throw new Error("Ghép đồ không hợp lệ")
    if (c1.id !== "item" || c2.id !== "item" || gold.id !== "gold" || c1.kind !== "support") throw new Error("Cần 2 Đồ + 1 Vàng")
    if (c1.frozen || c2.frozen || gold.frozen) throw new Error("Lá đang Hoá Băng")
    const result = cardCombine(c1.item!,
        c2.item!)
    if (!result || !CARD_ITEMS[result]) throw new Error("Không ghép được")
    for (const c of [c1,
        c2,
        gold]) removeFromHand(g,
        a.side,
        c)
    // món ghép xong là 1 lá đồ huyền thoại lên tay (tay đầy thì vào mộ); đeo bằng cách đánh lá đó lên 1 tướng mình
    const card = g.newCard({
        kind: "support", id: "legend", item: result
    })
    g.emit({
        t: "craft", side: a.side, item: result, card
    })
    g.giveCard(a.side,
        card,
        "hand")
    g.hook("onCraft",
        {
            side: a.side, item: result, gold
        })
}

// ======================================================================
// Nhịp lượt
// ======================================================================
function beginTurn(g: Game) {
    const s = g.s, side = s.active
    s.actionsThisTurn = 0
    ;(s.ownTurns ??= {
    })[side] = (s.ownTurns[side] ?? 0) + 1
    s.turnAttacks = {
        used: 0, cardless: []
    }
    s.offTurnAttacks = {
        used: 0, cardless: []
    }
    s.attackCounts = {
    }
    g.emit({
        t: "turnStart", side, round: s.round
    })
    g.respawnDue(side)
    g.hook("onTurnStartAway",
        {
            side
        }) // tướng dự bị/đang chết của side (Vayne: +Đêm)
    // mana: pháp sư của phe có lượt hồi đầu lượt
    for (const u of g.heroes(side)) if (g.isMage(u)) g.gainMana(u,
        g.manaRegen(u),
        "turn")
    g.giveMageTemps(side) // Pháp sư nhận chiêu tạm (RULES.mageTempSkill)
    g.hook("onTurnStart",
        {
            side
        })
    for (const tok of Object.values(s.units)) { // hành vi của vật triệu hồi (Thiếu Nữ của Yorick...)
        if (isOver(g)) break
        if (!tok.token || tok.status !== "board" || tok.side !== side) continue
        getTokenBehavior(tok.token.id)?.onOwnerTurnStart?.(g,
            tok,
            g.unit(tok.token.ownerId))
    }
    g.fireDelayed("turnStart",
        side)
    if (isOver(g)) return
    // Thiêu Đốt (phép bổ trợ): mất máu đầu lượt của chủ tướng
    for (const u of g.board(side)) { const v = g.statusV(u,
        "ignite"); if (v > 0) g.damage(undefined,
        u,
        v,
        "true",
        {
            tag: "dot"
        }) }
    if (isOver(g)) return
    drawStep(g)
    if (!isOver(g)) giveFreeCards(g,
        side)
}

/** Quà tặng đều đặn (không lấy từ bộ bài), từ lượt thứ 2 của mình: mỗi RULES.freeBasicEvery lượt +1 Đánh Thường; mỗi RULES.freeItemEvery lượt +1 mảnh đồ ngẫu nhiên; mỗi RULES.freeGoldEvery lượt +1 lá Vàng; lượt freeSkillOffset, +freeSkillEvery... +1 lá chiêu tạo mới của 1 tướng mình trên sân. Lượt đầu không có quà (tay đầu giữ đúng RULES.startHand). */
function giveFreeCards(g: Game, side: Side) {
    const n = g.s.ownTurns?.[side] ?? 0
    // RULES.secondFirstBasic: bên đi sau nhận quà Đánh Thường ngay lượt đầu
    const early = n === 1 && RULES.secondFirstBasic > 0 && side !== "A"
    if ((n > 1 && n % RULES.freeBasicEvery === 0) || early) g.giveFreeCard(side,
        "basic")
    if (n > 0 && n % RULES.freeItemEvery === 0) g.giveFreeCard(side,
        "item")
    if (n > 0 && RULES.freeGoldEvery > 0 && n % RULES.freeGoldEvery === 0) g.giveFreeCard(side,
        "gold")
    if (RULES.freeSkillEvery > 0 && n >= RULES.freeSkillOffset && (n - RULES.freeSkillOffset) % RULES.freeSkillEvery === 0) g.giveFreeCard(side,
        "skill")
}

/** Rút bài đầu lượt: lượt đầu của mỗi phe không rút (tay đầu đã rút trước bước gọi tướng); các lượt sau rút RULES.drawPerTurn. Bộ trống ngay lúc bắt đầu rút: thua; hết giữa chừng thì dừng. */
function drawStep(g: Game) {
    const s = g.s, side = s.active
    s.phase = "main"
    if (!s.firstTurnDone?.[side]) {
        (s.firstTurnDone ??= {
        })[side] = true
        return
    }
    if (!g.player(side).deck.length) { g.endGame(otherSide(side),
        "deck"); return }
    let n = g.drawCount(side)
    while (n-- > 0 && !isOver(g) && g.player(side).deck.length) g.drawOne(side,
        "turn")
}

function endTurn(g: Game) {
    const s = g.s, side = s.active
    // tự đánh cuối lượt (chỉ HeroDef.autoAttack: Kog'Maw E...); không tính vào giới hạn đòn
    for (const u of g.board(side)) {
        if (isOver(g)) break
        if (u.status !== "board" || !g.canAttack(u)) continue
        const def = g.hero(u)
        const t = def.autoAttack ? def.autoAttack(g,
            u) : undefined
        if (t) g.attack(u,
            t,
            {
                free: true
            })
    }
    if (isOver(g)) return
    for (const tok of Object.values(s.units)) {
        if (isOver(g)) break
        if (!tok.token || tok.status !== "board" || tok.side !== side) continue
        getTokenBehavior(tok.token.id)?.onOwnerTurnEnd?.(g,
            tok,
            g.unit(tok.token.ownerId))
    }
    g.fireDelayed("turnEnd",
        side)
    if (isOver(g)) return
    g.hook("onTurnEnd",
        {
            side
        })
    g.expireTemps(side)
    g.expireTokens()
    g.expireReveals()
    // trạng thái có decay giảm cuối lượt của CHỦ nó
    for (const u of Object.values(s.units)) {
        if (u.side !== side) continue
        for (const [id,
            st] of Object.entries(u.statuses)) {
            if (!st.decay) continue
            st.v -= st.decay
            if (st.v <= 0) g.removeStatus(u,
                id)
            else g.emit({
                t: "status", target: u.id, id, turns: 0, v: st.v
            })
        }
    }
    g.expireTransforms(side)
    g.expireMarks()
    for (const u of Object.values(s.units)) {
        for (const id of Object.keys(u.statuses)) if (u.statuses[id].until <= s.turnNo) g.removeStatus(u,
            id)
    }
    g.emit({
        t: "turnEnd", side
    })
    if (side === "B") { s.round++; g.emit({
        t: "roundStart", round: s.round, openLanes: g.openLanes()
    }); g.hook("onRoundStart",
        {
            round: s.round
        }) }
    s.active = otherSide(side)
    s.turnNo++
    if (isOver(g)) return
    if (side === "B") beginRound(g)
    else beginTurn(g)
}

// ======================================================================
// Hiển thị
// ======================================================================
/** Tên + mô tả đã tính công thức theo tướng (nếu có) cho UI */
export function cardInfo(g: Game, card: Card, unit?: Unit): { name: string; desc: string; type: string } {
    if (card.kind === "support" && card.id === "legend") {
        const it = getItem(card.item ?? ""), tx = itemText(card.item ?? "",
            "vi")
        return {
            name: tx?.name ?? it?.name ?? card.item ?? "Đồ", desc: `Đồ huyền thoại: đánh lá này lên 1 tướng mình còn ô đồ để đeo. ${tx ? `${tx.stats}. ${tx.passive}: ${tx.desc}` : it ? itemStatText(it) : ""}`.trim(), type: "support"
        }
    }
    if (card.kind === "support" && card.id === "item" && card.item) {
        const tx = itemText(card.item,
            "vi")
        if (tx) return {
            name: `${SUPPORT_NAME.item}: ${tx.name}`, desc: `${SUPPORT_DESC.item} ${tx.stats}.`, type: "support"
        }
    }
    if (card.kind === "support") return {
        name: SUPPORT_NAME[card.id] ?? SPELL_VI[spellOf(card.id) ?? "heal"]?.name ?? card.id, desc: SUPPORT_DESC[card.id] ?? (spellOf(card.id) ? SPELL_VI[spellOf(card.id)!].desc : ""), type: "support"
    }
    if (card.kind === "special") {
        const sp = getSpecialCard(card.id)
        let name = sp?.name ?? card.id
        if (card.id === "pick_card") { // V3: lá chọn lá từ mộ (g.offerPick) ghi tên lá sẽ lấy
            const target = Object.values(g.s.players).flatMap((pl) => pl.grave).find((c) => c.uid === String(card.data?.uid))
            if (target) name = `${name}: ${cardInfo(g,
                target).name}`
        }
        return {
            name, desc: sp?.desc ?? "", type: "special"
        }
    }
    const def = skillOfCard(card)
    const u = unit ?? heroUnitOfCard(g,
        card,
        card.side ?? "A")
    return {
        name: def ? `${getHero(card.hero!)?.name}: ${def.name}` : card.id, desc: def ? formulaText(def.desc,
            g,
            u) : "", type: "skill"
    }
}
