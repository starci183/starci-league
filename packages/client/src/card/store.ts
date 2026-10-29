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
    phase: "main" | "chain" | "over";
    toMove: Side;
    actionsThisTurn: number;
    openLanes: number[];
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
    rules: { lives: number; handMax: number; laneOpenRound: number[] };
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

function set(patch: Partial<CardSnapshot>) {
    snap = {
        ...snap, ...patch
    }
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

/** Engine `Game` dựng trên state nhận được, để gọi cg.cardInfo / g.stats / g.atk... cho hiển thị */
export function gameOf(v: CardView): cg.Game {
    return new cg.Game(v as unknown as cg.GameState)
}
