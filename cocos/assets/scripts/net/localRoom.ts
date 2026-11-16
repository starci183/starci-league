// Phòng đấu chạy ngay trong máy (không cần server): dùng cho màn Hướng dẫn. Cùng giao diện phòng mà net/game.ts wire() dùng
// (onMessage / send / onLeave / leave), nên MatchScreen chạy y như trận thật. Engine (cg) chạy cục bộ, người chơi là phe A;
// trạng thái gửi cho phe A dựng giống CardRoom.ts của server (ẩn tay đối thủ, lọc sự kiện rút bài, peek cho chủ bộ).
// Phe B là "người nộm": chỉ bỏ qua / kết thúc lượt, trừ khi kịch bản cho nó vài hành động định sẵn (để có đòn địch cho chiêu phản ứng).
import {
    cg
} from "../shared"

type Side = cg.Side
type Handler = (payload: never) => void
const other = (s: Side): Side => (s === "A" ? "B" : "A")
const YOU: Side = "A"

/** Một hành động định sẵn của phe B: hàm chọn trong các hành động hợp lệ (undefined = chưa tới lúc) */
export type EnemyStep = (legal: cg.Action[], s: cg.GameState) => cg.Action | undefined

export interface LocalRoomOptions {
    /** Thế cờ ban đầu (đã dựng xong, ví dụ qua cg.applyStage) */
    state: cg.GameState;
    /** Hành động định sẵn của phe B, làm lần lượt; hết thì B chỉ bỏ qua / kết thúc lượt */
    enemyPlan?: EnemyStep[];
    names?: Partial<Record<Side, string>>;
    /** Nhịp hành động của phe B (ms) */
    pace?: number;
}

const sigCard = (c: cg.Card | undefined) => (c ? `${c.kind}|${c.id}|${c.hero ?? ""}|${c.item ?? ""}|${c.copyOf ?? ""}` : "?")

/** Khoá so khớp hành động (như CardRoom.actionKey): lá cùng loại khác uid coi là một */
function actionKey(state: cg.GameState, a: cg.Action): string {
    const side = a.side
    const find = (uid: string) => state.players[side].hand.find((c) => c.uid === uid) ?? state.players[side].grave.find((c) => c.uid === uid)
    const cardsig = (uid: string) => sigCard(find(uid))
    const out: Record<string, unknown> = {
        ...a
    }
    if (a.t === "play" || a.t === "chain") {
        out.uid = cardsig(a.uid)
        if (a.args) {
            const args: Record<string, unknown> = {
                ...a.args
            }
            if (a.args.discard) args.discard = a.args.discard.map(cardsig).sort()
            if (a.args.pick && find(a.args.pick)) args.pick = cardsig(a.args.pick)
            if (a.args.targets) args.targets = [...a.args.targets].sort()
            out.args = args
        }
    } else if (a.t === "craft") {
        out.items = a.items.map(cardsig).sort()
        out.gold = cardsig(a.gold)
    }
    return JSON.stringify(out,
        Object.keys(out).sort())
}

const hidden = (c: cg.Card) => ({
    uid: c.uid, hidden: true as const, ...(c.temp ? {
        temp: true as const
    } : {
    })
})

/** Sự kiện cho người xem phe A: lá rút / tạo vào tay đối thủ chỉ còn uid (như CardRoom.eventsFor) */
function eventsFor(events: cg.GameEvent[]): unknown[] {
    return events.map((e) => {
        switch (e.t) {
        case "draw": case "drawAuto": case "prize":
            return e.side === YOU ? e : {
                ...e, card: hidden(e.card)
            }
        case "create":
            return e.side === YOU || e.zone === "grave" ? e : {
                ...e, card: hidden(e.card)
            }
        case "cardBurned":
            return e.card.temp && e.side !== YOU ? {
                ...e, card: hidden(e.card)
            } : e
        case "freeCard":
        case "tempExpired":
        case "cardFrozen":
        case "cardThawed":
            return e.side === YOU ? e : {
                ...e, card: hidden(e.card)
            }
        default: return e
        }
    })
}

/** Token úp mặt của đối thủ: bỏ dữ liệu bí mật */
function unitsFor(s: cg.GameState): cg.GameState["units"] {
    const out: cg.GameState["units"] = {
    }
    for (const [id,
        u] of Object.entries(s.units)) {
        out[id] = u.token?.hidden && u.side !== YOU ? {
            ...u, token: {
                ...u.token, secret: undefined, card: undefined
            }
        } : u
    }
    return out
}

export class LocalRoom {
    readonly roomId = "local"
    readonly sessionId = "local-A"
    private gs: cg.GameState
    private plan: EnemyStep[]
    private readonly names: Record<Side, string>
    private readonly pace: number
    private handlers = new Map<string, Handler[]>()
    private leaveHandlers: ((code: number) => void)[] = []
    private timer: ReturnType<typeof setTimeout> | null = null
    private disposed = false
    private ended = false
    private revealed = new Set<Side>()

    constructor(o: LocalRoomOptions) {
        this.gs = o.state
        this.plan = [...(o.enemyPlan ?? [])]
        this.names = {
            A: o.names?.A ?? "Bạn", B: o.names?.B ?? "Người nộm"
        }
        this.pace = o.pace ?? 1100
    }

    // ---- giao diện phòng mà net/game.ts dùng ----
    onMessage(type: string, cb: Handler) {
        const list = this.handlers.get(type) ?? []
        list.push(cb)
        this.handlers.set(type,
            list)
    }
    onLeave(cb: (code: number) => void) { this.leaveHandlers.push(cb) }
    send(type: string, payload?: unknown) {
        if (this.disposed) return
        // trả lời không đồng bộ như qua mạng, tránh gọi lồng trong lúc màn đang cập nhật
        setTimeout(() => this.receive(type,
            payload),
        0)
    }
    leave(): Promise<number> {
        this.dispose()
        for (const cb of this.leaveHandlers) cb(1000)
        return Promise.resolve(1000)
    }

    /** Dừng hẳn (huỷ nhịp phe B) */
    dispose() {
        this.disposed = true
        if (this.timer) clearTimeout(this.timer)
        this.timer = null
    }

    // ---- xử lý ----
    private emit(type: string, payload: unknown) {
        if (this.disposed) return
        for (const cb of this.handlers.get(type) ?? []) (cb as (p: unknown) => void)(payload)
    }

    private receive(type: string, payload: unknown) {
        if (this.disposed) return
        if (type === "cg:sync") {
            this.sendState()
            if (this.ended) this.emit("cg:end",
                {
                    winner: this.gs.winner ?? null, reason: this.gs.endReason ?? "lives"
                })
            this.pump()
        } else if (type === "cg:action") {
            const raw = (payload as { action?: cg.Action } | undefined)?.action
            try {
                if (this.ended) throw new Error("Trận đã kết thúc")
                if (!raw) throw new Error("Thiếu action")
                this.humanAction(raw)
            } catch (e) {
                this.emit("cg:error",
                    {
                        code: "illegal", msg: (e as Error).message
                    })
                this.sendState()
            }
        } else if (type === "cg:resign") {
            if (!this.ended) this.finish("B",
                "resign")
        }
    }

    private humanAction(raw: cg.Action) {
        const gs = this.gs
        if (gs.phase !== "blind" && cg.whoseMove(gs) !== YOU) throw new Error("Chưa tới lượt bạn")
        const action = {
            ...raw, side: YOU
        } as cg.Action
        const key = actionKey(gs,
            action)
        if (!cg.legalActions(gs,
            YOU).some((a) => actionKey(gs,
            a) === key)) throw new Error("Hành động không hợp lệ")
        this.apply(action)
    }

    private apply(action: cg.Action) {
        const res = cg.applyAction(this.gs,
            action)
        this.gs = res.state
        for (const e of res.events) {
            const r = e as unknown as { t: string; side?: Side; to?: Side }
            if (r.t === "reveal" && r.side && (r.to ?? other(r.side)) === YOU) this.revealed.add(r.side)
        }
        if (res.events.length) this.emit("cg:events",
            eventsFor(res.events))
        if (res.state.phase === "over") { this.finish(res.state.winner ?? null,
            res.state.endReason ?? "lives"); return }
        this.sendState()
        this.revealed.clear()
        this.pump()
    }

    private finish(winner: Side | null, reason: string) {
        if (this.ended) return
        this.ended = true
        if (this.timer) clearTimeout(this.timer)
        this.timer = null
        this.sendState()
        this.emit("cg:end",
            {
                winner, reason
            })
    }

    /** Phe B tới lượt quyết định thì hẹn một nhịp rồi đi */
    private pump() {
        if (this.disposed || this.ended || this.timer) return
        if (!cg.actorsOf(this.gs).includes("B")) return
        const scripted = this.plan.length > 0 && this.gs.phase !== "chain"
        this.timer = setTimeout(() => {
            this.timer = null
            if (this.disposed || this.ended) return
            this.enemyStep()
        },
        scripted ? this.pace : Math.round(this.pace * 0.5))
    }

    private enemyStep() {
        const gs = this.gs
        if (!cg.actorsOf(gs).includes("B")) return
        const legal = cg.legalActions(gs,
            "B")
        let action: cg.Action | undefined
        if (this.plan.length) {
            action = this.plan[0](legal,
                gs)
            if (action) this.plan.shift()
        }
        // người nộm: không làm gì ngoài bỏ qua chuỗi, sang bước kế ở Standby, kết thúc lượt
        action ??= legal.find((a) => a.t === "pass") ?? legal.find((a) => a.t === "ready")
            ?? (gs.step === "standby" ? legal.find((a) => a.t === "step") : undefined)
            ?? legal.find((a) => a.t === "end") ?? legal[0]
        if (!action) return
        try {
            this.apply(action)
        } catch (e) {
            console.error("[local] lỗi engine:",
                e)
            this.finish(null,
                "error")
        }
    }

    /** Trạng thái cho phe A (giống CardRoom.viewOf + sendState) */
    private sendState() {
        const s = this.gs
        const g = new cg.Game(s)
        const players: Record<string, unknown> = {
        }
        for (const side of ["A",
            "B"] as Side[]) {
            const p = s.players[side]
            const showHand = side === YOU || this.revealed.has(side) || g.handRevealed(side)
            players[side] = {
                side, heroes: p.heroes, lives: p.lives, grave: p.grave, handCount: p.hand.length, deckCount: p.deck.length,
                hand: showHand ? p.hand : undefined,
                deckSummary: cg.deckSummaryFor(p.deck,
                    side,
                    YOU),
            }
        }
        const legal = !this.ended && cg.actorsOf(s).includes(YOU) ? cg.legalActions(s,
            YOU) : null
        const view: Record<string, unknown> = {
            you: YOU, round: s.round, turnNo: s.turnNo, active: s.active, phase: s.phase,
            teamMana: {
                A: g.teamManaOf("A"), B: g.teamManaOf("B")
            },
            toMove: cg.whoseMove(s),
            blind: undefined,
            actionsThisTurn: s.actionsThisTurn, step: s.step, openLanes: g.openLanes(), players, units: unitsFor(s),
            lanes: s.lanes, laneStacks: s.laneStacks, markers: s.markers, laneElements: s.laneElements,
            chain: s.chain, extra: s.extra, prizes: s.prizes, winner: s.winner, endReason: s.endReason, stats: s.stats,
            turnAttacks: g.turnAttacks(s.active),
            offTurnAttacks: g.turnAttacks(other(s.active)),
            names: this.names, bots: {
                B: "easy"
            },
            rules: {
                lives: cg.RULES.lives, handMax: cg.RULES.handMax, laneOpenRound: cg.RULES.laneOpenRound, summonRounds: cg.RULES.summonRounds,
                drawPerTurn: cg.RULES.drawPerTurn, fighterCardlessMult: cg.RULES.fighterCardlessMult,
                teamManaMax: cg.RULES.teamManaMax, teamManaStart: cg.RULES.teamManaStart,
                mage: {
                    manaMax: cg.RULES.mage.manaMax
                },
                skillCopies: cg.RULES.skillCopies,
            },
        }
        // lá trên cùng bộ mà lựa chọn của bạn cần thấy (Twisted Fate Q)
        if (legal) {
            const want = new Set<string>()
            for (const a of legal) if ((a.t === "play" || a.t === "chain") && a.args?.pick) want.add(a.args.pick)
            if (want.size) view.peek = s.players[YOU].deck.filter((c) => want.has(c.uid))
        }
        this.emit("cg:state",
            view)
        if (legal) this.emit("cg:legal",
            legal)
    }
}

/** Áp một hành động của phe A không phát sự kiện (dựng thế cờ), phe B bỏ qua mọi chuỗi mở ra. Trả state mới. */
export function applySilently(state: cg.GameState, action: cg.Action): cg.GameState {
    let s = cg.applyAction(state,
        action).state
    for (let i = 0; i < 20 && s.phase === "chain" && s.chain; i++) {
        const side = s.chain.priority
        s = cg.applyAction(s,
            {
                t: "pass", side
            }).state
    }
    return s
}
