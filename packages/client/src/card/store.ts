// Kết nối phòng "card" (docs/CARDGAME_PROTOCOL.md) + kho trạng thái cho giao diện React của chế độ thẻ bài.
// Mọi component đọc bằng useCard(), gửi hành động qua cardActions. Không component nào tự nói chuyện với Colyseus.
import {
    useSyncExternalStore
} from "react"
import {
    Client, type Room
} from "colyseus.js"
import {
    cg
} from "@starci/shared"

type Side = cg.Side
type Action = cg.Action
type Card = cg.Card
type Unit = cg.Unit
type GameEvent = cg.GameEvent

/** Tướng trong màn chọn (cg:draft) */
export interface DraftHero { id: string; name: string; role: cg.Role; hp: number; atk: number; armor: number; mr: number; damage: "physical" | "magic" }
/** Một lượt cấm/chọn */
export interface DraftTurn { side: Side; action: "ban" | "pick" }
/** cg:draft: trạng thái cấm/chọn kiểu LMHT (gửi lại sau mỗi lượt) */
export interface DraftInfo {
    pool: DraftHero[];
    /** Số tướng mỗi đội */
    size: number;
    order: DraftTurn[];
    /** Chỉ số lượt hiện tại trong order */
    step: number;
    /** Lượt hiện tại (null = xong) */
    turn: DraftTurn | null;
    bans: string[];
    picks: Record<Side, string[]>;
    /** Phe của bạn (null = khách xem) */
    you: Side | null;
    /** Thời gian còn lại của lượt này (0 = không giới hạn) */
    deadlineMs: number;
}

/** Phần công khai của một người chơi trong cg:state */
export interface PlayerView {
    side: Side;
    heroes: string[];
    lives: number;
    grave: Card[];
    handCount: number;
    deckCount: number;
    /** Chỉ có cho bản thân (hoặc khi bị lộ tay) */
    hand?: Card[];
}

/** cg:state: trạng thái trận đã ẩn thông tin bí mật cho người nhận */
export interface CardView {
    you: Side | null;
    round: number;
    turnNo: number;
    active: Side;
    phase: "blind" | "summon" | "main" | "chain" | "over";
    toMove: Side;
    actionsThisTurn: number;
    /** Số đòn đã đánh của phe CÓ LƯỢT (V2: tối đa 3, tính mọi đòn kể cả đòn Quick không cần lá và đòn miễn phí) */
    turnAttacks: { used: number; cardless: string[] };
    /** Như turnAttacks nhưng cho phe KHÔNG có lượt (đòn Quick đánh trong lượt đối thủ) */
    offTurnAttacks: { used: number; cardless: string[] };
    /** Giới hạn cứng số đòn mỗi phe mỗi lượt */
    attackLimit: number;
    /** Gọi tướng úp (phase "blind"): lựa chọn của phe kia luôn rỗng tới khi lật; ready công khai */
    blind?: { cap: number; picks: Record<Side, { hero: string; lane: number }[]>; ready: Record<Side, boolean> };
    openLanes: number[];
    /** Lá trên cùng bộ của bạn mà lựa chọn hiện tại cần xem (Twisted Fate Q: chọn lá xuống đáy). Chỉ chủ bộ nhận. */
    peek?: Card[];
    players: Record<Side, PlayerView>;
    units: Record<string, Unit>;
    lanes: Record<Side, (string | null)[]>;
    chain: cg.Chain | null;
    extra: Record<Side, string | null>;
    prizes: Record<Side, number>;
    winner: Side | null;
    endReason: string | null;
    names: Record<Side, string>;
    bots: Partial<Record<Side, string>>;
    rules: {
        lives: number; handMax: number; laneOpenRound: number[];
        attackLimit: number; drawPerTurn: number; fighterCardlessMult: number;
        mage: { manaMax: number }; skillCopies: Record<cg.SkillKey, number>;
    };
}

/** Một dòng nhật ký (sự kiện engine đã nhận, kèm số thứ tự để làm key React) */
export interface LogEntry { n: number; e: GameEvent }

/** Lá bài đang được chọn để đánh: các hành động hợp lệ còn lại chờ người chơi chọn mục tiêu */
export interface Targeting {
    /** uid lá trên tay (hoặc id tướng khi là đòn miễn phí / gọi tướng) */
    source: string;
    /** Các hành động hợp lệ ứng với nguồn này (lọc từ legal) */
    options: Action[];
}

export interface CardSnapshot {
    /** connecting -> waiting -> draft -> playing -> ended; error khi không vào được phòng */
    stage: "idle" | "connecting" | "waiting" | "draft" | "playing" | "ended" | "error";
    draft: DraftInfo | null;
    /** Bên nào đã chọn xong (cg:picked) */
    picked: Partial<Record<Side, boolean>>;
    view: CardView | null;
    /** Hành động hợp lệ của bạn lúc này (rỗng khi không tới lượt) */
    legal: Action[];
    /** Sự kiện của lần cập nhật gần nhất (để chơi hiệu ứng) */
    lastEvents: GameEvent[];
    /** Toàn bộ nhật ký trận */
    log: LogEntry[];
    targeting: Targeting | null;
    /** Tướng đang xem trong bảng chỉ số bên phải (bấm tướng trên sân để chọn) */
    inspect: string | null;
    error: string | null;
    end: { winner: Side | null; reason: string } | null;
    /** Tăng mỗi lần nhận cg:events, để component biết có lô sự kiện mới */
    tick: number;
}

const EMPTY: CardSnapshot = {
    stage: "idle", draft: null, picked: {
    }, view: null, legal: [], lastEvents: [], log: [], targeting: null, inspect: null, error: null, end: null, tick: 0,
}

let snap: CardSnapshot = EMPTY
const listeners = new Set<() => void>()
let room: Room | null = null
let logN = 0

// ---------------------------------------------------------------- khung hình hiển thị (display view)
// Store giữ view THẬT (trạng thái mới nhất của server) nhưng snap.view là bản HIỂN THỊ: units/lanes/extra (và cờ frozen của lá trên tay)
// đi sau, chỉ được cập nhật khi hoạt ảnh tới từng sự kiện (applyToDisplay). Hết hàng đợi hoạt ảnh (hoặc tắt hoạt ảnh) thì snapDisplay() = view thật.
interface Lag {
    units: Record<string, Unit>;
    lanes: Record<Side, (string | null)[]>;
    extra: Record<Side, string | null>;
    /** uid lá trên tay -> id tướng đã làm lá Hoá Băng (undefined = chưa/đã tan) theo thứ tự hoạt ảnh */
    frozen: Map<string, string | undefined>;
}

let realView: CardView | null = null
let lag: Lag | null = null
let lagVer = 0
let lagEnabled = false
let lagTimer: number | undefined
let shownCache: { r: CardView; v: number; out: CardView } | null = null
const applied = new WeakSet<GameEvent>()

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T

/** View mà component thấy: view thật + phần hiển thị đi sau (nếu đang chờ hoạt ảnh) */
function shown(): CardView | null {
    const r = realView
    if (!r || !lag) return r
    if (shownCache && shownCache.r === r && shownCache.v === lagVer) return shownCache.out
    const players = {
        ...r.players
    }
    if (lag.frozen.size) {
        for (const s of ["A",
            "B"] as Side[]) {
            const p = r.players[s]
            if (!p.hand) continue
            players[s] = {
                ...p, hand: p.hand.map((c) => (lag!.frozen.has(c.uid) ? {
                    ...c, frozen: lag!.frozen.get(c.uid)
                } : c))
            }
        }
    }
    const out: CardView = {
        ...r, units: lag.units, lanes: lag.lanes, extra: lag.extra, players
    }
    shownCache = {
        r, v: lagVer, out
    }
    return out
}

function republish() {
    lagVer++
    snap = {
        ...snap, view: shown()
    }
    for (const l of listeners) l()
}

/** AnimLayer bật khi đang chạy hoạt ảnh; tắt (hoặc reduced-motion) thì mọi thứ hiện ngay */
export function setDisplayLag(on: boolean) {
    lagEnabled = on
    if (!on) snapDisplay()
}

/** Hiển thị = view thật (hết lô, bỏ qua lô, tắt hoạt ảnh, rời trận) */
export function snapDisplay() {
    window.clearTimeout(lagTimer)
    if (!lag) return
    lag = null
    republish()
}

/** Lô sự kiện vừa tới (TRƯỚC cg:state của nó): chụp bản hiển thị từ view thật cũ */
function beginLag(events: GameEvent[]) {
    if (!lagEnabled || !realView) return
    const r = realView
    if (!lag) {
        lag = {
            units: clone(r.units), lanes: clone(r.lanes), extra: clone(r.extra), frozen: new Map()
        }
    }
    for (const e of events) {
        if (e.t !== "cardFrozen" && e.t !== "cardThawed") continue
        if (lag.frozen.has(e.card.uid)) continue
        const old = [...(r.players.A.hand ?? []),
            ...(r.players.B.hand ?? [])].find((c) => c.uid === e.card.uid)
        lag.frozen.set(e.card.uid,
            old?.frozen)
    }
    // chốt chặn: hoạt ảnh kẹt thì sau 25 giây hiện thẳng trạng thái thật
    window.clearTimeout(lagTimer)
    lagTimer = window.setTimeout(snapDisplay,
        25_000)
    republish()
}

const sideOfId = (id: string): Side => (id.startsWith("B:") ? "B" : "A")

/** Áp hiệu ứng nhìn thấy của các sự kiện lên bản hiển thị (mỗi sự kiện chỉ một lần). Sự kiện lạ thì chờ tới khi snap. */
export function applyToDisplay(events: GameEvent[]) {
    const real = realView
    const cur = lag
    if (!real || !cur || !events.length) return
    let units = cur.units
    let lanes = cur.lanes
    let extra = cur.extra
    let changed = false
    const upd = (id: string, fn: (u: Unit) => Unit) => {
        const u = units[id]
        if (!u) return
        units = {
            ...units, [id]: fn(u)
        }
        changed = true
    }
    const fromReal = (id: string) => {
        const r = real.units[id]
        units = {
            ...units
        }
        if (r) units[id] = clone(r)
        else delete units[id]
        changed = true
    }
    const syncLanes = (side: Side) => {
        lanes = {
            ...lanes, [side]: [...real.lanes[side]]
        }
        extra = {
            ...extra, [side]: real.extra[side]
        }
        for (const id of Object.keys(units)) {
            const ru = real.units[id]
            if (ru && units[id].side === side && !units[id].token) units[id] = {
                ...units[id], lane: ru.lane
            }
        }
        changed = true
    }
    for (const e of events) {
        if (applied.has(e)) continue
        applied.add(e)
        switch (e.t) {
        case "damage":
            upd(e.target,
                (u) => ({
                    ...u, hp: e.hp, shield: Math.max(0,
                        u.shield - e.absorbed)
                }))
            break
        case "heal":
            upd(e.target,
                (u) => ({
                    ...u, hp: e.hp
                }))
            break
        case "shield":
            upd(e.target,
                (u) => ({
                    ...u, shield: e.shield
                }))
            break
        case "status":
            upd(e.target,
                (u) => ({
                    ...u, statuses: {
                        ...u.statuses, [e.id]: real.units[e.target]?.statuses[e.id] ?? {
                            until: real.turnNo + e.turns, v: e.v, at: real.turnNo, src: e.src, card: e.card
                        }
                    }
                }))
            break
        case "statusEnd":
            upd(e.target,
                (u) => {
                    const st = {
                        ...u.statuses
                    }
                    delete st[e.id]
                    return {
                        ...u, statuses: st
                    }
                })
            break
        case "stack":
            upd(e.unit,
                (u) => ({
                    ...u, stacks: {
                        ...u.stacks, [e.key]: e.value
                    }
                }))
            break
        case "manaChange":
            upd(e.unit,
                (u) => ({
                    ...u, mana: e.mana
                }))
            break
        case "kill":
            fromReal(e.target)
            syncLanes(sideOfId(e.target))
            break
        case "summon":
        case "respawn":
            fromReal(e.unit)
            if (e.t === "summon" && e.swapped) fromReal(e.swapped)
            syncLanes(sideOfId(e.unit))
            break
        case "move":
            fromReal(e.unit)
            if (e.with) fromReal(e.with)
            syncLanes(sideOfId(e.unit))
            break
        case "equip":
        case "upgrade":
            upd(e.unit,
                (u) => ({
                    ...u, items: [...(real.units[e.unit]?.items ?? u.items)]
                }))
            break
        case "craft":
            if (e.unit) upd(e.unit,
                (u) => ({
                    ...u, items: [...(real.units[e.unit!]?.items ?? u.items)]
                }))
            break
        case "summonToken":
        case "tokenEnd":
        case "tokenFlip":
            fromReal(e.unit)
            syncLanes(sideOfId(e.unit))
            break
        case "cardFrozen":
            cur.frozen.set(e.card.uid,
                e.by)
            changed = true
            break
        case "cardThawed":
            cur.frozen.set(e.card.uid,
                undefined)
            changed = true
            break
        default:
            break
        }
    }
    if (!changed) return
    lag = {
        ...cur, units, lanes, extra
    }
    republish()
}

function set(patch: Partial<CardSnapshot>) {
    if ("view" in patch) {
        realView = patch.view ?? null
        if (!realView) {
            lag = null
            window.clearTimeout(lagTimer)
        }
    }
    snap = {
        ...snap, ...patch
    }
    if ("view" in patch) snap.view = shown()
    for (const l of listeners) l()
}

/** Hook đọc trạng thái chế độ thẻ bài */
export function useCard(): CardSnapshot {
    return useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb) },
        () => snap)
}
export const getCard = () => snap

/** Tuỳ chọn khi vào phòng (xem mục 1 của docs/CARDGAME_PROTOCOL.md) */
export interface CardJoin { name: string; token?: string; bot?: "easy" | "hard"; roomId?: string; quick?: boolean; deck?: string[] }

const actionKey = (a: Action) => JSON.stringify(a)

export const cardActions = {
    /** Vào phòng card: bot -> create, roomId -> joinById, còn lại joinOrCreate */
    async connect(o: CardJoin) {
        set({
            ...EMPTY, stage: "connecting"
        })
        const proto = location.protocol === "https:" ? "wss" : "ws"
        const client = new Client(`${proto}://${location.hostname}:2567`)
        const opts = {
            name: o.name, token: o.token, deck: o.deck
        }
        try {
            room = o.bot ? await client.create("card",
                {
                    ...opts, bot: o.bot
                })
                : o.roomId ? await client.joinById(o.roomId,
                    opts)
                    : await client.joinOrCreate("card",
                        opts)
        } catch (e) {
            set({
                stage: "error", error: (e as Error).message
            })
            return
        }
        room.onMessage("cg:waiting",
            () => set({
                stage: "waiting"
            }))
        room.onMessage("cg:draft",
            (d: DraftInfo) => set({
                stage: "draft", draft: d
            }))
        room.onMessage("cg:picked",
            ({ side }: { side: Side }) => set({
                picked: {
                    ...snap.picked, [side]: true
                }
            }))
        room.onMessage("cg:events",
            (events: GameEvent[]) => {
                beginLag(events)
                const add = events.map((e) => ({
                    n: ++logN, e
                }))
                set({
                    lastEvents: events, log: [...snap.log,
                        ...add].slice(-400), tick: snap.tick + 1
                })
            })
        room.onMessage("cg:state",
            (v: CardView) => set({
                view: v,
                stage: snap.stage === "ended" ? "ended" : "playing",
                // server gửi cg:legal ngay sau cg:state nếu tới lượt bạn
                legal: [],
                targeting: null,
            }))
        room.onMessage("cg:legal",
            (legal: Action[]) => set({
                legal
            }))
        room.onMessage("cg:error",
            (err: { code: string; msg: string }) => set({
                error: err.msg
            }))
        room.onMessage("cg:end",
            (end: { winner: Side | null; reason: string }) => set({
                stage: "ended", end
            }))
        room.onMessage("cg:simStats",
            () => {})
        room.onLeave((code) => {
            if (snap.stage !== "ended") set({
                stage: "error", error: `disconnected (${code})`
            })
        })
        room.send("cg:sync",
            {
            })
    },
    /** Cấm hoặc chọn 1 tướng trong lượt cấm/chọn của bạn */
    draftAct(hero: string) { room?.send("cg:draftAct",
        {
            hero
        }) },
    /** Gửi một hành động (nên lấy từ legal) */
    act(action: Action) {
        set({
            legal: [], targeting: null, error: null
        })
        room?.send("cg:action",
            {
                action
            })
    },
    resign() { room?.send("cg:resign",
        {
        }) },
    leave() { void room?.leave(); room = null; set(EMPTY) },
    /** Chọn tướng để xem ở bảng chỉ số (null = bỏ chọn) */
    inspect(unitId: string | null) { set({
        inspect: unitId
    }) },
    clearError() { set({
        error: null
    }) },

    // ---- chọn mục tiêu (Hand/ActionBar bắt đầu, Board kết thúc) ----
    /** Bắt đầu chọn mục tiêu cho các hành động `options`; chỉ 1 lựa chọn thì gửi luôn */
    beginTargeting(source: string, options: Action[]) {
        if (options.length === 1) return cardActions.act(options[0])
        set({
            targeting: options.length ? {
                source, options
            } : null
        })
    },
    cancelTargeting() { set({
        targeting: null
    }) },
    /** Board gọi khi bấm vào tướng `unitId`: thu hẹp lựa chọn về các hành động nhắm tướng đó */
    chooseUnit(unitId: string) {
        const t = snap.targeting
        if (!t) return
        const hit = t.options.filter((a) => targetsOf(a).units.includes(unitId))
        cardActions.beginTargeting(t.source,
            hit)
    },
    /** Board gọi khi bấm vào một đường trống `lane` của phe mình */
    chooseLane(lane: number) {
        const t = snap.targeting
        if (!t) return
        cardActions.beginTargeting(t.source,
            t.options.filter((a) => targetsOf(a).lanes.includes(lane)))
    },
}

/** Tướng / đường mà một hành động nhắm tới (để Board tô sáng) */
export function targetsOf(a: Action): { units: string[]; lanes: number[] } {
    if (a.t === "summon") return {
        units: [], lanes: [a.lane]
    }
    if (a.t === "attack") return {
        units: [a.target], lanes: []
    }
    if (a.t === "craft") return {
        units: a.unit ? [a.unit] : [], lanes: []
    }
    if (a.t === "play" || a.t === "chain") {
        const args = a.args ?? {
        }
        const units = [...(args.target ? [args.target] : []),
            ...(args.targets ?? [])]
        if (!units.length && args.actor) units.push(args.actor)
        return {
            units, lanes: args.lane !== undefined ? [args.lane] : []
        }
    }
    return {
        units: [], lanes: []
    }
}

/** Các tướng / đường đang chọn được (Board tô sáng) */
export function targetable(t: Targeting | null): { units: Set<string>; lanes: Set<number> } {
    const units = new Set<string>(), lanes = new Set<number>()
    for (const a of t?.options ?? []) {
        const x = targetsOf(a)
        x.units.forEach((u) => units.add(u))
        x.lanes.forEach((l) => lanes.add(l))
    }
    return {
        units, lanes
    }
}

/** Các hành động hợp lệ dùng lá `uid` (play hoặc chain), gộp lá trùng loại theo uid đại diện */
export function actionsForCard(legal: Action[], uid: string): Action[] {
    const seen = new Set<string>()
    return legal.filter((a) => (a.t === "play" || a.t === "chain") && a.uid === uid && !seen.has(actionKey(a)) && !!seen.add(actionKey(a)))
}

/** Chữ ký lá: các lá cùng chữ ký là một (engine chỉ liệt kê hành động cho 1 lá đại diện) */
export const cardSig = (c: Card) => `${c.kind}|${c.id}|${c.hero ?? ""}|${c.item ?? ""}|${c.copyOf ?? ""}`

/** Hành động hợp lệ dùng lá `card` trên tay, kể cả khi engine liệt kê theo uid của một lá khác cùng loại */
export function actionsForHandCard(legal: Action[], hand: Card[], card: Card): Action[] {
    const sig = cardSig(card)
    const uids = new Set(hand.filter((c) => cardSig(c) === sig).map((c) => c.uid))
    return legal.filter((a) => (a.t === "play" || a.t === "chain") && uids.has(a.uid))
}

/** Các đòn "Đánh nhanh" (Đấu sĩ đánh không cần lá, Quick) của tướng `unitId`, lọc từ legal */
export function cardlessOptions(legal: Action[], unitId: string): Action[] {
    return legal.filter((a) => a.t === "attack" && !!a.cardless && a.actor === unitId)
}

/** Các đòn miễn phí (từ buff đòn kế tiếp, không tính giới hạn) của tướng `unitId`, lọc từ legal */
export function freeAttackOptions(legal: Action[], unitId: string): Action[] {
    return legal.filter((a) => a.t === "attack" && !a.cardless && a.actor === unitId)
}

/** Mana lá chiêu `card` tốn (chỉ lá chiêu của Pháp sư đang trên sân; còn lại undefined) */
export function manaCostOf(g: cg.Game, card: Card): number | undefined {
    if (card.kind !== "skill" || !card.hero || !card.side) return undefined
    const u = g.unit(`${card.side}:${card.hero}`)
    if (!u || !g.isMage(u)) return undefined
    const key = card.id.slice(card.hero.length + 1).toUpperCase() as cg.SkillKey
    const def = cg.getHero(card.hero)?.skills[key]
    return def ? g.manaCost(u,
        def,
        card) : undefined
}

/** Số đòn đã đánh + các Đấu sĩ đã dùng đòn Quick của `side` lượt này, và giới hạn (đọc đúng phe có lượt hay không) */
export function attacksOf(v: CardView, side: Side): { used: number; limit: number; cardless: string[] } {
    const t = side === v.active ? v.turnAttacks : v.offTurnAttacks
    return {
        used: t?.used ?? 0, limit: v.attackLimit ?? v.rules.attackLimit, cardless: t?.cardless ?? []
    }
}

/** Engine `Game` dựng trên state nhận được, để gọi cg.cardInfo / g.stats / g.atk... cho hiển thị */
export function gameOf(v: CardView): cg.Game {
    return new cg.Game(v as unknown as cg.GameState)
}
