// Engine thuần: newGame / legalActions / applyAction. Không phụ thuộc Colyseus, state là JSON.
import {
    combine, getItem
} from "../items"
import {
    formulaText
} from "./formula"
import {
    Game
} from "./game"
import {
    getHero, getSpecialCard
} from "./registry"
import {
    RULES, SIDES, otherSide,
    type Action, type Card, type ChainLink, type Ctx, type GameEvent, type GameState, type OptCtx, type PlayArgs, type ReactFx, type Side, type SkillDef, type SkillKey,
    type TargetKind, type Trigger, type Unit,
} from "./types"

// ======================================================================
// Khởi tạo
// ======================================================================
export function newGameEx(seed: number, teamA: string[], teamB: string[]): { state: GameState; events: GameEvent[] } {
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
        for (const [id,
            n] of Object.entries(RULES.baseDeck)) for (let i = 0; i < n!; i++) p.deck.push(g.supportCard(id))
        g.shuffle(p.deck)
        for (let i = 0; i < RULES.startHand; i++) { const c = p.deck.shift(); if (c) p.hand.push(c) }
        // 3 thẻ chiêu chung: chưa biết sẽ gọi tướng nào
        for (const k of ["q",
            "e",
            "r"]) p.hand.push(g.newCard({
            kind: "wild", id: `wild_${k}`
        }))
        // lá thưởng úp: ngẫu nhiên từ thẻ hỗ trợ + thẻ chiêu chung, không lấy từ bộ bài chính
        for (let i = 0; i < RULES.prizeCount; i++) {
            const id = PRIZE_POOL[g.randInt(PRIZE_POOL.length)]
            s.prizeCards[side].push(id.startsWith("wild_") ? g.newCard({
                kind: "wild", id
            }) : g.supportCard(id))
        }
        s.prizes[side] = s.prizeCards[side].length
    }
    g.emit({
        t: "roundStart", round: 1, openLanes: g.openLanes()
    })
    beginTurn(g)
    return {
        state: s, events: g.events
    }
}
export const newGame = (seed: number, teamA: string[], teamB: string[]) => newGameEx(seed,
    teamA,
    teamB).state
const PRIZE_POOL = ["basic",
    "gold",
    "item",
    "potion",
    "draw",
    "buff",
    "wild_q",
    "wild_e",
    "wild_r"]

// ======================================================================
// Tra cứu lá
// ======================================================================
const isOver = (g: Game) => g.s.phase === "over"
const keyOf = (id: string): SkillKey => id.slice(-1).toUpperCase() as SkillKey
const sig = (c: Card) => `${c.kind}|${c.id}|${c.hero ?? ""}|${c.item ?? ""}|${c.copyOf ?? ""}`

/** Chiêu mà lá chiêu/lá Bóng này tung (wild thì cần tướng tung) */
export function skillOfCard(card: Card, wildHero?: string): SkillDef | undefined {
    if (card.kind === "wild") return wildHero ? getHero(wildHero)?.skills[keyOf(card.id)] : undefined
    if (card.kind !== "skill" && !card.copyOf) return undefined
    return card.hero ? getHero(card.hero)?.skills[keyOf(card.copyOf ?? card.id)] : undefined
}
const heroUnitOfCard = (g: Game, card: Card, side: Side) => (card.kind === "skill" || card.copyOf ? g.unit(`${card.side ?? side}:${card.hero}`) : undefined)

function tauntFilter(g: Game, side: Side, list: Unit[]): Unit[] {
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
    if (role === "marksman") {
        list = g.enemies(a)
        if (viaCard) { const tanks = list.filter((u) => g.role(u) === "tank"); if (tanks.length) list = tanks }
    } else {
        const o = g.opposite(a)
        list = o ? [o] : []
    }
    return tauntFilter(g,
        a.side,
        list)
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
function targetValues(g: Game, side: Side, self: Unit, k: TargetKind, max: number): PlayArgs[] {
    const taunters = g.enemies(side).filter((u) => g.has(u,
        "taunt"))
    switch (k) {
    case "none": case "self": case "all_enemies": case "all_allies": return [{
    }]
    case "opposite": return g.opposite(self) ? [{
    }] : []
    case "enemy": return tauntFilter(g,
        side,
        g.enemies(self)).map((u) => ({
        target: u.id
    }))
    case "ally": return g.allies(self).map((u) => ({
        target: u.id
    }))
    case "ally_other": return g.allies(self,
        false).map((u) => ({
        target: u.id
    }))
    case "enemies_upto": return subsets(g.enemies(self),
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
            def.max ?? 1)
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
/** Mọi PlayArgs hợp lệ để đánh lá `card` (không tính phản ứng) */
export function playOptions(g: Game, side: Side, card: Card): PlayArgs[] {
    const p = g.player(side)
    if (isOver(g)) return []
    if (card.kind === "support") {
        switch (card.id) {
        case "basic": {
            const out: PlayArgs[] = []
            for (const a of g.board(side)) {
                if (!g.canAct(a) || g.role(a) === "fighter") continue
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
        default: return [] // gold/item chỉ dùng qua ghép đồ
        }
    }
    if (card.kind === "wild") {
        const out: PlayArgs[] = []
        for (const u of g.board(side)) {
            if (!g.canCast(u)) continue
            const def = skillOfCard(card,
                u.hero)
            if (!def || def.chainOnly) continue
            for (const a of skillArgs(g,
                side,
                u,
                card,
                def)) out.push({
                ...a, actor: u.id
            })
        }
        return out
    }
    if (card.kind === "skill" || card.copyOf) {
        const u = heroUnitOfCard(g,
            card,
            side)
        const def = skillOfCard(card)
        if (!u || !def || u.side !== side || !g.canCast(u) || def.chainOnly) return []
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
        if (seen.has(sig(card))) continue
        seen.add(sig(card))
        if (card.kind === "wild") {
            // thẻ chiêu chung chỉ mượn chiêu Quick thường, không mượn chiêu chỉ-nối-chuỗi
            for (const u of g.heroes(side)) { const def = skillOfCard(card,
                u.hero); if (def && !def.chainOnly) add(card,
                u,
                def,
                u.id) }
        } else if (card.kind === "skill" || card.copyOf) {
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
    if (s.active !== side) return []
    const out: Action[] = []
    if (s.actionsThisTurn < RULES.maxActionsPerTurn) {
    // gọi tướng
        for (const h of s.players[side].heroes) {
            const u = s.units[`${side}:${h}`]
            if (u.status !== "reserve") continue
            const def = getHero(h)!
            const lanes = def.summonLanes ? def.summonLanes(g,
                side) : g.emptyLanes(side)
            for (const lane of lanes) out.push({
                t: "summon", side, hero: h, lane
            })
        }
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
        // đòn miễn phí nhờ buff
        for (const a of g.board(side)) {
            if (!g.canAct(a) || !a.nextAttack.some((b) => b.free)) continue
            for (const t of attackTargets(g,
                a,
                false)) out.push({
                t: "attack", side, actor: a.id, target: t.id
            })
        }
        // ghép đồ
        const hand = s.players[side].hand
        const items = hand.filter((c) => c.kind === "support" && c.id === "item")
        const gold = hand.find((c) => c.kind === "support" && c.id === "gold")
        if (gold && items.length >= 2) {
            const pairs = new Set<string>()
            for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
                const k = [items[i].item,
                    items[j].item].sort().join("+")
                if (pairs.has(k) || !combine(items[i].item!,
items[j].item!)) continue
                pairs.add(k)
                for (const u of g.board(side)) if (u.items.length < RULES.itemSlots) out.push({
                    t: "craft", side, items: [items[i].uid,
                        items[j].uid], gold: gold.uid, unit: u.id
                })
            }
        }
    }
    out.push({
        t: "end", side
    })
    return out
}

// ======================================================================
// Áp hành động
// ======================================================================
export function applyAction(state: GameState, action: Action): { state: GameState; events: GameEvent[] } {
    const s = structuredClone(state) as GameState
    const g = new Game(s)
    if (s.phase === "over") throw new Error("Trận đã kết thúc")
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
    s.actionsThisTurn++
    switch (action.t) {
    case "summon": {
        const def = getHero(action.hero)
        const u = s.units[`${action.side}:${action.hero}`]
        if (!def || !u || u.status !== "reserve") throw new Error("Tướng không gọi được")
        const lanes = def.summonLanes ? def.summonLanes(g,
            action.side) : g.emptyLanes(action.side)
        if (!lanes.includes(action.lane)) throw new Error("Đường không hợp lệ")
        g.summon(action.side,
            action.hero,
            action.lane)
        break
    }
    case "play": {
        const card = s.players[action.side].hand.find((c) => c.uid === action.uid)
        if (!card) throw new Error("Không có lá này trên tay")
        const args = action.args ?? {
        }
        if (!playOptions(g,
            action.side,
            card).some((o) => Game.argsKey(o) === Game.argsKey(args))) throw new Error(`Lá ${card.id} không đánh được với tham số này`)
        removeFromHand(g,
            action.side,
            card)
        s.stats[action.side].cardsPlayed++
        g.emit({
            t: "play", side: action.side, card, args
        })
        startChain(g,
            action.side,
            "card",
            card,
            args)
        break
    }
    case "attack": {
        const a = g.unit(action.actor), t = g.unit(action.target)
        if (!a || !t || a.side !== action.side || !g.canAct(a) || !a.nextAttack.some((b) => b.free) || !attackTargets(g,
            a,
            false).some((x) => x.id === t.id)) throw new Error("Đòn đánh miễn phí không hợp lệ")
        startChain(g,
            action.side,
            "attack",
            undefined,
            {
                actor: a.id, target: t.id
            })
        break
    }
    case "craft": doCraft(g,
        action); break
    case "end": endTurn(g); break
    default: throw new Error("Hành động không hợp lệ ở lượt này")
    }
    return {
        state: s, events: g.events
    }
}

function removeFromHand(g: Game, side: Side, card: Card) {
    const h = g.player(side).hand
    h.splice(h.findIndex((c) => c.uid === card.uid),
        1)
}

// ======================================================================
// Chuỗi (Chain) kiểu Yu-Gi-Oh: lá gốc là mắt xích 1, hai bên lần lượt nối lá Quick hoặc bỏ qua;
// hai lần bỏ qua liên tiếp thì giải quyết từ mắt xích cuối về đầu.
// ======================================================================
/** Mô tả mắt xích: nhắm ai, nhắm đơn hay nhiều, chiêu cuối, có thể đổi mục tiêu sang ai */
function describeLink(g: Game, side: Side, card: Card | undefined, args: PlayArgs): { trigger: Trigger; targets: string[] } {
    const foe = otherSide(side)
    const isAttack = !card
    const caster = isAttack || card.kind === "wild" || card.kind === "support" ? g.unit(args.actor) : heroUnitOfCard(g,
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
    return chainOptions(g,
        side,
        ch.links[ch.links.length - 1].trigger)
}

function startChain(g: Game, side: Side, kind: "card" | "attack", card: Card | undefined, args: PlayArgs) {
    const { trigger, targets } = describeLink(g,
        side,
        card,
        args)
    g.s.chain = {
        links: [{
            n: 1, side, kind, card, actor: trigger.actor, args, targets, trigger, quick: false
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
    g.emit({
        t: "play", side: action.side, card, args, reaction: true
    })
    const { trigger, targets } = describeLink(g,
        action.side,
        card,
        args)
    const n = ch.links.length + 1
    ch.links.push({
        n, side: action.side, kind: "card", card, actor: trigger.actor, args, targets, trigger, quick: true, reactTo: top.trigger
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
            L)
        carry = g.s.fxNext
        g.s.fx = undefined; g.s.fxNext = undefined
    }
    if (ch.opened) g.emit({
        t: "chainEnd", length: ch.links.length
    })
}

function resolveLink(g: Game, L: ChainLink) {
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
        if (a && t && a.status === "board" && t.status === "board") g.attack(a,
            t,
            {
                free: true
            })
    } else if (L.card) resolveCard(g,
        L.side,
        L.card,
        args,
        L.reactTo)
}

// ======================================================================
// Giải quyết một lá
// ======================================================================
const SUPPORT_NAME: Record<string, string> = {
    basic: "Đánh thường", gold: "Vàng", item: "Đồ", potion: "Bình Máu", draw: "Rút Bài", buff: "Bổ Trợ"
}
const SUPPORT_DESC: Record<string, string> = {
    basic: "1 tướng mình đánh thường theo luật vai.",
    gold: "1 vàng: 2 Đồ + 1 Vàng ghép thành 1 món đồ.",
    item: "Mảnh đồ: 2 Đồ + 1 Vàng ghép thành 1 món đồ.",
    potion: "1 tướng mình hồi {150} + 10% máu tối đa.",
    draw: "Rút 2 lá.",
    buff: "1 tướng mình +20% sát thương và Khiên 100 tới hết lượt đối thủ.",
}

function resolveCard(g: Game, side: Side, card: Card, args: PlayArgs, trigger?: Trigger) {
    let dest = "grave" as "grave" | "hand" | "vanish"
    if (card.kind === "support") {
        dest = "vanish"
        const tgt = g.unit(args.target)
        switch (card.id) {
        case "basic": {
            const a = g.unit(args.actor)
            if (a && tgt && g.canAct(a) && tgt.status === "board") g.attack(a,
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
        }
        g.hook("onPlay",
            {
                side, card
            })
    } else if (card.kind === "wild" || card.kind === "skill" || card.copyOf) {
        const self = card.kind === "wild" ? g.unit(args.actor) : heroUnitOfCard(g,
            card,
            side)
        const def = card.kind === "wild" ? skillOfCard(card,
            self?.hero) : skillOfCard(card)
        if (card.copyOf || card.temp) dest = "vanish"
        if (self && def && self.side === side) {
            const kinds0 = Array.isArray(def.target) ? def.target : [def.target]
            const redirected = kinds0.includes("opposite") && args.target && g.unit(args.target)?.side !== side ? g.unit(args.target) : undefined // Braum Q đổi mục tiêu chiêu "đối diện"
            const target = trigger && def.chainOnly ? g.unit(trigger.target) : kinds0.includes("opposite") ? redirected ?? g.opposite(self) : g.unit(args.target)
            const picked = kinds0.includes("opposite") ? (target ? [target] : []) : (args.targets ?? (args.target ? [args.target] : [])).map((id) => g.unit(id)).filter((u): u is Unit => !!u && u.status === "board")
            const targets = trigger && def.chainOnly ? (target ? [target] : []) : picked
            const kinds = Array.isArray(def.target) ? def.target : [def.target]
            const needsTarget = !def.chainOnly && kinds.some((k) => k === "opposite" || k === "enemy" || k === "ally" || k === "ally_other")
            const needsAny = !def.chainOnly && kinds.some((k) => k === "enemies_upto" || k === "allies_upto") && (args.targets?.length ?? 0) > 0
            if (!(needsTarget && (!target || target.status !== "board")) && !(needsAny && !targets.length) && self.status === "board") {
                const ctx: Ctx = {
                    g, self, side, card, args, target, targets, lane: args.lane, trigger,
                    f: (expr) => g.f(self,
                        expr),
                    toHand: () => { dest = "hand" },
                    vanish: () => { dest = "vanish" },
                }
                g.emit({
                    t: "cast", unit: self.id, skill: def.key, target: target?.id
                })
                g.hook("onPlay",
                    {
                        side, card, unit: self
                    })
                def.resolve(ctx)
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

function doCraft(g: Game, a: Extract<Action, { t: "craft" }>) {
    const hand = g.player(a.side).hand
    const c1 = hand.find((c) => c.uid === a.items[0]), c2 = hand.find((c) => c.uid === a.items[1]), gold = hand.find((c) => c.uid === a.gold)
    const u = g.unit(a.unit)
    if (!c1 || !c2 || c1.uid === c2.uid || !gold || !u || u.side !== a.side || u.status !== "board" || u.items.length >= RULES.itemSlots) throw new Error("Ghép đồ không hợp lệ")
    if (c1.id !== "item" || c2.id !== "item" || gold.id !== "gold" || c1.kind !== "support") throw new Error("Cần 2 Đồ + 1 Vàng")
    const result = combine(c1.item!,
c2.item!)
    if (!result || !getItem(result)) throw new Error("Không ghép được")
    for (const c of [c1,
        c2,
        gold]) removeFromHand(g,
        a.side,
        c)
    const before = g.stats(u).hp
    u.items.push(result)
    const dh = g.stats(u).hp - before
    u.maxHp += dh; u.hp += dh
    g.emit({
        t: "craft", side: a.side, unit: u.id, item: result
    })
    g.hook("onCraft",
        {
            side: a.side, unit: u, item: result, gold
        })
}

// ======================================================================
// Nhịp lượt
// ======================================================================
function beginTurn(g: Game) {
    const s = g.s, side = s.active
    s.actionsThisTurn = 0
    g.emit({
        t: "turnStart", side, round: s.round
    })
    g.respawnDue(side)
    g.hook("onTurnStart",
        {
            side
        })
    if (isOver(g)) return
    let n = RULES.drawPerTurn + g.board(side).filter((u) => g.role(u) === "support").length
    while (n-- > 0 && !isOver(g)) {
        if (!g.player(side).deck.length) { g.endGame(otherSide(side),
            "deck"); return }
        g.drawOne(side,
            "turn")
    }
}

function endTurn(g: Game) {
    const s = g.s, side = s.active
    // tự đánh cuối lượt (đấu sĩ, Kog'Maw E...)
    for (const u of g.board(side)) {
        if (isOver(g)) break
        if (u.status !== "board" || !g.canAct(u)) continue
        const def = g.hero(u)
        const t = def.autoAttack ? def.autoAttack(g,
            u) : def.role === "fighter" ? g.opposite(u) : undefined
        if (t) g.attack(u,
            t,
            {
                free: true
            })
    }
    if (isOver(g)) return
    g.hook("onTurnEnd",
        {
            side
        })
    const hand = g.player(side).hand
    g.player(side).hand = hand.filter((c) => !c.temp)
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
    if (!isOver(g)) beginTurn(g)
}

// ======================================================================
// Hiển thị
// ======================================================================
/** Tên + mô tả đã tính công thức theo tướng (nếu có) cho UI */
export function cardInfo(g: Game, card: Card, unit?: Unit): { name: string; desc: string; type: string } {
    if (card.kind === "support") return {
        name: SUPPORT_NAME[card.id] ?? card.id, desc: SUPPORT_DESC[card.id] ?? "", type: "support"
    }
    if (card.kind === "special") { const sp = getSpecialCard(card.id); return {
        name: sp?.name ?? card.id, desc: sp?.desc ?? "", type: "special"
    } }
    if (card.kind === "wild") {
        const def = unit ? skillOfCard(card,
            unit.hero) : undefined
        return {
            name: `Chiêu chung ${keyOf(card.id)}`, desc: def ? formulaText(def.desc,
                g,
                unit) : "Chọn 1 tướng mình trên sân để tung chiêu này.", type: "wild"
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
