// Bot "easy" (tham lam 1 nước): bản gốc của bot.ts, giữ nguyên hành vi.
// Bot tham lam: thử từng hành động hợp lệ trên bản sao state (applyAction), chấm điểm theo sự kiện sinh ra:
// hạ gục > sát thương > hồi máu/khiên > rút bài. Biết gọi tướng khi đường mở và ghép đồ.
import {
    applyAction, legalActions
} from "./engine"
import {
    summonLaneFit, summonValue
} from "./botEval"
import {
    Game
} from "./game"
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
        case "kill": {
            // hạ vật triệu hồi đáng ít hơn hạ tướng (không mất mạng)
            const tok = !!(before.units[e.target]?.token ?? after.units[e.target]?.token)
            const v = tok ? 60 : 400
            sc += sideOf(e.target) === side ? -v : v
            break
        }
        case "heal": if (sideOf(e.target) === side) sc += e.amount * 0.8; break
        case "shield": if (sideOf(e.target) === side) sc += e.amount * 0.3; break
        case "draw": if (e.side === side && e.reason !== "turn") sc += after.players[side].hand.length < RULES.handMax ? 18 : 3; break
        case "burn": if (e.side !== side) sc += 12; break
        // tay đầy: lá bị đốt vào mộ (lá tạm đằng nào cũng mất nên không phạt)
        case "cardBurned": if (!e.card.temp) sc += e.side === side ? -10 : 6; break
        // mana thang x10: chi mana trừ nhẹ (đổi lấy hiệu ứng), hồi mana cộng
        case "manaChange":
        case "teamManaChange": {
            const us = e.t === "teamManaChange" ? e.side : sideOf(e.unit)
            if (us === side && e.reason === "spend") sc += e.delta * 0.3
            else if (us === side && e.reason === "restore") sc += e.delta * 0.4
            break
        }
        case "tempExpired": if (e.side === side) sc -= 2; break
        case "create": if (e.side !== side) sc += e.card.id === "mushroom" ? (e.zone === "deck" ? 30 : 8) : 8; else if (e.card.copyOf) sc += 20; else if (e.zone === "hand" && e.card.kind === "support") sc += 12; break
        case "summonToken": if (e.side === side) sc += 80; break
        case "equip": {
            const u = before.units[e.unit]
            const role = u ? getHero(u.hero)?.role : undefined
            if (e.side === side) sc += 200 - 10 * (u?.items.length ?? 0) + (role === "mage" || role === "marksman" || role === "assassin" ? 20 : 0)
            break
        }
        case "respawn": if (sideOf(e.unit) === side && before.units[e.unit]?.status === "dead") sc += 300; break
        case "statusEnd": if (sideOf(e.target) === side && ["stun",
            "silence",
            "ignite",
            "bleed",
            "burn",
            "exhaust"].includes(e.id) && before.units[e.target]?.statuses[e.id]) sc += 25; break
        case "prize": if (e.side === side) sc += 25; break
        case "stack": if (e.key === "itemAmp" && sideOf(e.unit) === side) sc += 2 * e.value; break
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
                "storm",
                "exhaust",
                "ignite"].includes(e.id)) sc += 30
            else if (ts && ts !== side && ["sunlight",
                "illum",
                "charm",
                "bleed",
                "silver",
                "burn"].includes(e.id)) sc += 10 + (e.id === "burn" ? 8 * e.v : 0)
            else if (ts === side && ["see_hand",
                "kog_arty",
                "nami_bless",
                "aatrox_r",
                "vayne_r",
                "mushroom_season"].includes(e.id)) sc += 15
            else if (ts === side && e.id === "stealth") sc += 40
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
export function chooseActionGreedy(state: GameState, side: Side): Action {
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
    const dead = new Game(state)
    for (const a of legal) {
        let sc: number
        if (a.t === "end" || a.t === "pass" || a.t === "draw" || a.t === "ready" || a.t === "unequip" || a.t === "discard") continue
        if (a.t === "summon") {
            // chọn tướng theo tay bài (summonValue: chỉ tay mình + sân công khai, không nhìn lựa chọn úp của địch);
            // đường chỉ phân thứ hạng giữa các đường của CÙNG một tướng
            sc = 1000 + summonValue(state,
                side,
                a.hero) + 0.01 * summonLaneFit(state,
                side,
                a.hero,
                a.lane) - 0.001 * LANE_ORDER.indexOf(a.lane)
            if (sc > bestScore) { bestScore = sc; best = a; chosen = true }
            continue
        } else if (a.t === "craft") {
            sc = 300 // ghép xong: lá đồ huyền thoại lên tay, đeo bằng một lượt đánh lá sau
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
                const val = !c ? 0 : c.temp ? 0 : c.kind === "skill" && dead.isDeadCard(c) ? 1 : c.kind === "skill" || c.kind === "wild" ? 5 : c.id === "gold" || c.id === "item" ? 3 : c.id === "basic" ? 2 : 4
                const prev = seenDiscardGroup.get(key)
                if (prev !== undefined && prev <= val) continue
                seenDiscardGroup.set(key,
                    val)
            }
            // không nhìn trộm token úp của đối thủ: nhắm vào nó thì chấm theo giá trị kỳ vọng cố định
            const tgt = a.t === "play" ? state.units[a.args?.target ?? ""] : a.t === "attack" ? state.units[a.target] : undefined
            if (tgt?.token?.hidden && tgt.side !== side) sc = 45
            else {
                const r = settle(state,
                    applyAction(state,
                        a))
                sc = scoreEvents(r.events,
                    state,
                    r.state,
                    side)
            }
        }
        sc += noise()
        if (sc > bestScore) { bestScore = sc; best = a; chosen = true }
    }
    // nhóm discard: có thể đã chọn nhầm nhóm khi lá tốt hơn xuất hiện sau; chấp nhận (heuristic)
    if (!chosen) return legal.find((a) => a.t === "end" || a.t === "pass" || a.t === "draw" || a.t === "ready") ?? best
    return best
}
