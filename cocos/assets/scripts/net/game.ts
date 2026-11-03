// Kết nối phòng "card" của server Colyseus và giữ trạng thái trận cho các màn Cocos.
// Giao thức: docs/CARDGAME_PROTOCOL.md. Luật và dữ liệu (tướng, bộ chiêu, đồ, bài) lấy từ shared, cùng nguồn với server.
import {
    cg
} from "../shared"
import {
    WS_BASE
} from "./config"

type Side = cg.Side

/** Client Colyseus bản Cocos (plugin vendor/colyseus.js gắn vào globalThis) */
interface ColyseusRoom {
    id: string;
    sessionId: string;
    send(type: string, payload?: unknown): void;
    onMessage(type: string, cb: (payload: never) => void): void;
    onLeave(cb: (code: number) => void): void;
    leave(consented?: boolean): Promise<number>;
}
interface ColyseusClient {
    create(name: string, options: object): Promise<ColyseusRoom>;
    joinById(id: string, options: object): Promise<ColyseusRoom>;
    joinOrCreate(name: string, options: object): Promise<ColyseusRoom>;
}
const Colyseus = (globalThis as unknown as { Colyseus: { Client: new (url: string) => ColyseusClient } }).Colyseus

export interface DraftHero { id: string; name: string; role: cg.Role; hp: number; atk: number; armor: number; mr: number; damage: "physical" | "magic" }
export interface DraftInfo {
    pool: DraftHero[];
    size: number;
    order: { side: Side; action: "ban" | "pick" }[];
    step: number;
    turn: { side: Side; action: "ban" | "pick" } | null;
    bans: string[];
    picks: Record<Side, string[]>;
    you: Side | null;
    deadlineMs: number;
}

export interface PlayerView {
    side: Side; heroes: string[]; lives: number; grave: cg.Card[]; handCount: number; deckCount: number; hand?: cg.Card[];
}
/** cg:state (đã ẩn thông tin bí mật cho người nhận) */
export interface CardView {
    you: Side | null;
    round: number;
    turnNo: number;
    active: Side;
    phase: "blind" | "summon" | "main" | "chain" | "over";
    toMove: Side;
    step?: cg.TurnStep;
    blind?: { cap: number; picks: Record<Side, { hero: string; lane: number }[]>; ready: Record<Side, boolean> };
    openLanes: number[];
    players: Record<Side, PlayerView>;
    teamMana: Record<Side, number>;
    units: Record<string, cg.Unit>;
    lanes: Record<Side, (string | null)[]>;
    chain: cg.Chain | null;
    extra: Record<Side, string | null>;
    prizes: Record<Side, number>;
    winner: Side | null;
    endReason: string | null;
    names: Record<Side, string>;
    bots: Partial<Record<Side, string>>;
    stats?: Record<string, unknown>;
    /** Lá trên cùng bộ mà lựa chọn hiện tại cần xem (chỉ chủ bộ nhận) */
    peek?: cg.Card[];
    /** Dấu trên đường, chồng hiệu ứng của ô, Nguyên Tố của đường (công khai) */
    markers?: unknown;
    laneStacks?: unknown;
    laneElements?: string[];
    rules: { lives: number; handMax: number; teamManaMax?: number };
}

export type Stage = "idle" | "connecting" | "waiting" | "draft" | "playing" | "ended" | "error"
export interface JoinOptions { name: string; token?: string; bot?: "easy" | "hard"; roomId?: string; create?: boolean; deck?: string[] }

export interface GameSnapshot {
    stage: Stage;
    roomId: string | null;
    draft: DraftInfo | null;
    view: CardView | null;
    legal: cg.Action[];
    log: cg.GameEvent[];
    end: { winner: Side | null; reason: string } | null;
    error: string | null;
    startedAt: number;
}

const EMPTY: GameSnapshot = {
    stage: "idle", roomId: null, draft: null, view: null, legal: [], log: [], end: null, error: null, startedAt: 0
}

let snap: GameSnapshot = {
    ...EMPTY
}
let room: ColyseusRoom | null = null
const listeners = new Set<(s: GameSnapshot) => void>()
const eventListeners = new Set<(events: cg.GameEvent[], view: CardView | null) => void>()

function set(patch: Partial<GameSnapshot>) {
    snap = {
        ...snap, ...patch
    }
    for (const l of [...listeners]) l(snap)
}

export const getGame = () => snap
/** Nghe mọi thay đổi trạng thái; trả hàm huỷ */
export function onGame(l: (s: GameSnapshot) => void): () => void {
    listeners.add(l)
    return () => listeners.delete(l)
}
/** Nghe từng lô sự kiện engine (để chơi VFX theo thứ tự); view là trạng thái trước lô */
export function onGameEvents(l: (events: cg.GameEvent[], view: CardView | null) => void): () => void {
    eventListeners.add(l)
    return () => eventListeners.delete(l)
}

function wire(r: ColyseusRoom) {
    room = r
    set({
        roomId: r.id
    })
    r.onMessage("cg:waiting",
        () => set({
            stage: "waiting"
        }))
    r.onMessage("cg:draft",
        (d: DraftInfo) => set({
            stage: "draft", draft: d
        }))
    r.onMessage("cg:picked",
        () => undefined)
    r.onMessage("cg:events",
        (events: cg.GameEvent[]) => {
            for (const l of [...eventListeners]) l(events,
                snap.view)
            set({
                log: [...snap.log,
                    ...events].slice(-300)
            })
        })
    r.onMessage("cg:state",
        (v: CardView) => set({
            view: v, stage: snap.stage === "ended" ? "ended" : "playing", legal: []
        }))
    r.onMessage("cg:legal",
        (legal: cg.Action[]) => set({
            legal
        }))
    r.onMessage("cg:error",
        (e: { code: string; msg: string }) => set({
            error: e.msg
        }))
    r.onMessage("cg:end",
        (end: { winner: Side | null; reason: string }) => set({
            stage: "ended", end
        }))
    r.onMessage("cg:simStats",
        () => undefined)
    r.onLeave(() => {
        if (snap.stage !== "ended" && room === r) set({
            stage: "error", error: "Mất kết nối máy chủ"
        })
    })
    r.send("cg:sync",
        {
        })
}

export const gameActions = {
    /** Đấu máy: create + bot; phòng riêng: create (private) hoặc joinById; còn lại ghép ngẫu nhiên */
    async connect(o: JoinOptions) {
        await gameActions.leave()
        set({
            ...EMPTY, stage: "connecting", startedAt: Date.now()
        })
        try {
            const client = new Colyseus.Client(WS_BASE)
            const base = {
                name: o.name, token: o.token, deck: o.deck
            }
            const r = o.bot
                ? await client.create("card",
                    {
                        ...base, bot: o.bot
                    })
                : o.roomId
                    ? await client.joinById(o.roomId,
                        base)
                    : o.create
                        ? await client.create("card",
                            {
                                ...base, private: true
                            })
                        : await client.joinOrCreate("card",
                            base)
            wire(r)
        } catch (e) {
            set({
                stage: "error", error: (e as Error).message || "Không vào được phòng"
            })
        }
    },
    draftAct(hero: string) {
        room?.send("cg:draftAct",
            {
                hero
            })
    },
    act(action: cg.Action) {
        set({
            legal: [], error: null
        })
        room?.send("cg:action",
            {
                action
            })
    },
    resign() {
        room?.send("cg:resign",
            {
            })
    },
    async leave() {
        const r = room
        room = null
        if (r) await r.leave(true).catch(() => 0)
        set({
            ...EMPTY
        })
    },
}

// ---- hàm đọc dữ liệu cho hiển thị (giống store.ts của bản web) ----

/** Engine Game dựng trên state nhận được, để gọi cg.cardInfo, g.manaCost... */
export const gameOf = (v: CardView): cg.Game => new cg.Game(v as unknown as cg.GameState)

export const heroName = (id: string): string => cg.getHero(id)?.name ?? id

/** Tên + mô tả + loại của lá (đúng như engine tính trên state hiện tại) */
export function cardText(v: CardView, card: cg.Card): { name: string; desc: string; type: string } {
    try {
        return cg.cardInfo(gameOf(v),
            card)
    } catch {
        return {
            name: card.id, desc: "", type: card.kind
        }
    }
}

/** Mana đội phải trả cho lá chiêu (undefined với lá không tốn mana) */
export function manaCostOf(v: CardView, card: cg.Card): number | undefined {
    if (!card.hero) return undefined
    const g = gameOf(v)
    const u = g.unit(`${card.side ?? v.you ?? "A"}:${card.hero}`)
    if (!u || u.token) return undefined
    const def = cg.skillOfCard(card)
    return def ? g.manaCost(u,
        def,
        card) : undefined
}

export const cardSig = (c: cg.Card) => `${c.kind}|${c.id}|${c.hero ?? ""}|${c.item ?? ""}|${c.copyOf ?? ""}${c.kind === "special" && c.data?.uid !== undefined ? `|${c.data.uid}` : ""}${c.data?.recycled ? `|r:${c.data.recycled}` : ""}`

/** Hành động hợp lệ dùng lá `card` (kể cả khi engine liệt kê theo uid lá khác cùng loại) */
export function actionsForHandCard(legal: cg.Action[], hand: cg.Card[], card: cg.Card): cg.Action[] {
    const sig = cardSig(card)
    const uids = new Set(hand.filter((c) => cardSig(c) === sig).map((c) => c.uid))
    return legal.filter((a) => (a.t === "play" || a.t === "chain") && uids.has(a.uid))
}

/** Tướng / đường mà một hành động nhắm tới */
export function targetsOf(a: cg.Action): { units: string[]; lanes: number[] } {
    if (a.t === "summon") return {
        units: [], lanes: [a.lane]
    }
    if (a.t === "attack") return {
        units: [a.target], lanes: []
    }
    if (a.t === "play" || a.t === "chain" || a.t === "ability") {
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
