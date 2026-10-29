// Bot tham lam: thử từng hành động hợp lệ trên bản sao state (applyAction), chấm điểm theo sự kiện sinh ra:
// hạ gục > sát thương > hồi máu/khiên > rút bài. Biết gọi tướng khi đường mở và ghép đồ.
import {
    applyAction, legalActions
} from "./engine"
import {
    getHero
} from "./registry"
import {
    RULES
} from "./types"
import type {
    Action, GameEvent, GameState, Side
} from "./types"


/** Giả định từ đây mọi bên đều bỏ qua: giải quyết hết chuỗi đang mở để chấm điểm kết quả thật */
function settle(state: GameState, r: { state: GameState; events: GameEvent[] }): { state: GameState; events: GameEvent[] } {
    let s = r.state
    const events = [...r.events]
    for (let i = 0; s.phase === "chain" && s.chain && i < 40; i++) {
        const x = applyAction(s,
            {
                t: "pass", side: s.chain.priority
            })
        s = x.state; events.push(...x.events)
    }
    void state
    return {
        state: s, events
    }
}

const ROLE_PRIORITY: Record<string, number> = {
    tank: 6, fighter: 5, marksman: 4, mage: 3, assassin: 2, support: 1
}
const LANE_ORDER = [2,
    1,
    3,
    0,
    4]

function scoreEvents(events: GameEvent[], before: GameState, after: GameState, side: Side): number {
    const sideOf = (id?: string) => (id ? before.units[id]?.side ?? after.units[id]?.side : undefined)
    let sc = 0
    for (const e of events) {
        switch (e.t) {
        case "damage": {
            const ts = sideOf(e.target)
            const v = e.hpLost + 0.3 * e.absorbed
            if (ts && ts !== side) sc += v; else if (ts === side) sc -= v * 1.2
            break
        }
        case "kill": sc += sideOf(e.target) === side ? -400 : 400; break
        case "heal": if (sideOf(e.target) === side) sc += e.amount * 0.8; break
        case "shield": if (sideOf(e.target) === side) sc += e.amount * 0.3; break
        case "draw": if (e.side === side && e.reason !== "turn") sc += after.players[side].hand.length < RULES.handMax ? 18 : 3; break
        case "burn": if (e.side !== side) sc += 12; break
        case "create": if (e.side !== side) sc += 8; else if (e.card.copyOf) sc += 20; break
        case "steal": if (e.to === side) sc += 15; break
        case "returnToHand": if (e.side === side) sc += 25; break
        case "status": {
            const ts = sideOf(e.target)
            if (ts && ts !== side && ["stun",
                "silence",
                "chill",
                "shred",
                "blind",
                "zedmark",
                "storm"].includes(e.id)) sc += 30
            else if (ts === side && ["see_hand",
                "kog_arty",
                "nami_bless"].includes(e.id)) sc += 15
            break
        }
        case "discard": if (e.side === side && e.reason === "effect") sc -= 4; else if (e.side !== side && e.reason === "effect") sc += 10; break
        case "shuffle": if (e.side === side && e.what === "graveIntoDeck") sc += before.players[side].deck.length < 15 ? Math.min(e.count,
            20) * 2 : 0; break
        case "end": sc += e.winner === side ? 100000 : -100000; break
        }
    }
    return sc
}

/** Chọn 1 hành động cho `side` (side phải là bên đang được hỏi: lượt hiện tại, hoặc bên đang có quyền nối chuỗi). Tất định theo state. */
export function chooseAction(state: GameState, side: Side): Action {
    const legal = legalActions(state,
        side)
    if (!legal.length) throw new Error("Không có hành động hợp lệ")
    let h = (state.seed ^ (state.turnNo * 2654435761) ^ (state.actionsThisTurn * 40503)) >>> 0
    const noise = () => { h = Math.imul(h ^ (h >>> 15),
        2246822519) >>> 0; return (h % 1000) / 2000 }
    let best: Action = legal[legal.length - 1]
    let bestScore = 0.5 // dưới ngưỡng này thì kết thúc lượt / bỏ qua phản ứng
    let chosen = false
    // đang có chuỗi: so với việc bỏ qua (chuỗi vẫn giải quyết), nối thêm lá phải tốt hơn ít nhất 5 điểm
    if (state.phase === "chain") {
        const pass = legal.find((a) => a.t === "pass")
        if (pass) { const r = settle(state,
            applyAction(state,
                pass)); bestScore = scoreEvents(r.events,
            state,
            r.state,
            side) + 5 }
    }
    const seenDiscardGroup = new Map<string, number>()
    for (const a of legal) {
        let sc: number
        if (a.t === "end" || a.t === "pass") continue
        if (a.t === "summon") {
            const role = getHero(a.hero)?.role ?? "support"
            sc = 1000 + (ROLE_PRIORITY[role] ?? 0) * 10 - LANE_ORDER.indexOf(a.lane)
        } else if (a.t === "craft") {
            const u = state.units[a.unit]
            const role = getHero(u.hero)?.role ?? "support"
            sc = 300 - 10 * u.items.length + (role === "mage" || role === "marksman" || role === "assassin" ? 5 : 0)
        } else {
            // gom các lựa chọn bỏ lá: chỉ thử lá bỏ ít giá trị nhất
            if (a.t === "play" && a.args?.discard?.length) {
                const key = JSON.stringify([a.uid,
                    a.args.actor,
                    a.args.target,
                    a.args.lane,
                    a.args.color,
                    a.args.pick])
                const c = state.players[side].hand.find((x) => x.uid === a.args!.discard![0])
                const val = !c ? 0 : c.kind === "skill" || c.kind === "wild" ? 5 : c.id === "gold" || c.id === "item" ? 3 : c.id === "basic" ? 2 : 4
                const prev = seenDiscardGroup.get(key)
                if (prev !== undefined && prev <= val) continue
                seenDiscardGroup.set(key,
                    val)
            }
            const r = settle(state,
                applyAction(state,
                    a))
            sc = scoreEvents(r.events,
                state,
                r.state,
                side)
        }
        sc += noise()
        if (sc > bestScore) { bestScore = sc; best = a; chosen = true }
    }
    // nhóm discard: có thể đã chọn nhầm nhóm khi lá tốt hơn xuất hiện sau; chấp nhận (heuristic)
    if (!chosen) return legal.find((a) => a.t === "end" || a.t === "pass") ?? best
    return best
}

/** Hỏi bên nào đang phải ra quyết định */
export const whoseMove = (s: GameState): Side => (s.phase === "chain" && s.chain ? s.chain.priority : s.active)
