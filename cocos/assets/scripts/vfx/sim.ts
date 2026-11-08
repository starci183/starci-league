// Mô phỏng một chiêu bằng ENGINE thật (packages/shared), cho thư viện tướng: dựng thế cờ 5 tướng mỗi bên đứng đủ 5 đường,
// đánh đúng lá chiêu qua legalActions + applyAction rồi gom sự kiện sát thương / hồi máu. Nhờ vậy số sát thương trong demo
// đúng công thức và đúng hành vi của bộ chiêu (Q Vel'Koz tách tia ngẫu nhiên, R 10 tia ngẫu nhiên, Sylas E hồi theo máu đã mất...).
import {
    cg
} from "../shared"

export type SimKey = "Q" | "E" | "R" | "basic"

export interface SimDamage {
    target: string;
    lane: number;
    side: "A" | "B";
    amount: number;
    kind: string;
    tag: string;
    /** 0: ngay khi đánh; 1: nhịp cuối lượt (Vel'Koz E đánh lần hai) */
    phase: number;
}
export interface SimHeal { target: string; amount: number; phase: number }
/** Một cú trúng theo đúng thứ tự engine: hồi máu, khiên hay sát thương, lên bên nào đường nào, xuất phát từ đâu (`via`) */
export interface SimHit {
    kind: "heal" | "shield" | "damage";
    side: "A" | "B";
    lane: number;
    amount: number;
    tag?: string;
    /** Loại sát thương (physical, magic, true) để tô màu số */
    dmgKind?: string;
    /** Đơn vị liền trước trong chuỗi nảy (Nami Q); thiếu là xuất phát từ tướng dùng chiêu */
    via?: { side: "A" | "B"; lane: number };
    phase: number;
}
/** Một lần đổi chỗ trong lúc đánh chiêu: `unit` (tướng chủ động) đi từ đường `from` sang `to`, `with` là người bị đổi */
export interface SimMove { unit: string; from: number; to: number; with?: string }
export interface SimOptions {
    hero: string;
    key: SimKey;
    /** 4 đồng đội ở các đường 0, 1, 3, 4 */
    mates: string[];
    /** 5 địch ở các đường 0..4 */
    foes: string[];
    /** Đường địch bị nhắm (chiêu cần chọn mục tiêu) */
    lane?: number;
    /** Sylas R: id tướng địch bị cướp chiêu cuối */
    steal?: string;
    /** Chiêu nhắm đồng minh (Sylas Q): mã tướng đồng minh được chọn */
    ally?: string;
    /** Máu ban đầu của tướng đang xem, theo tỉ lệ 0..1 */
    selfHp?: number;
}
export interface SimResult {
    ok: boolean;
    damage: SimDamage[];
    heals: SimHeal[];
    moves: SimMove[];
    /** Mọi cú hồi máu, khiên, sát thương theo thứ tự engine */
    hits: SimHit[];
    /** Tướng được đánh lần cuối lượt (có sự kiện phase 1) */
    endTurn: boolean;
}

function simulateInner(o: SimOptions): SimResult {
    const empty: SimResult = {
        ok: false, damage: [], heals: [], moves: [], hits: [], endTurn: false
    }
    cg.RULES.skillLimits = false
    const teamA = [o.hero, ...o.mates].slice(0, 5)
    const s = cg.newGame(20261101 + Math.floor(Math.random() * 1000),
        teamA,
        o.foes)
    s.round = 19
    s.blind = undefined
    const g = new cg.Game(s)
    g.summon("A",
        o.hero,
        2)
    teamA.filter((h) => h !== o.hero).forEach((h,
        i) => g.summon("A",
        h,
        [0,
            1,
            3,
            4][i]))
    o.foes.forEach((h,
        i) => g.summon("B",
        h,
        i))
    s.players.A.hand = []
    s.players.B.hand = []
    s.phase = "main"
    s.active = "A"
    s.opened = {
        A: true, B: true
    }
    s.firstTurnDone = {
        A: true, B: true
    }
    s.teamMana = {
        A: 200, B: 200
    }
    const self = s.units[`A:${o.hero}`]
    if (o.selfHp !== undefined) self.hp = Math.max(1,
        Math.round(self.maxHp * o.selfHp))
    const targetId = o.ally ? `A:${o.ally}` : o.lane === undefined ? undefined : `B:${o.foes[o.lane]}`

    let act: cg.Action | undefined
    if (o.key === "basic") {
        // Đòn không cần lá chỉ có ở Đấu sĩ; tướng khác đánh thường bằng lá Đánh (support "basic") như người chơi thật
        act = cg.legalActions(s,
            "A").find((a) => a.t === "attack" && a.actor === `A:${o.hero}` && (!targetId || a.target === targetId))
        if (!act) {
            const card = new cg.Game(s).supportCard("basic")
            s.players.A.hand.push(card)
            act = cg.legalActions(s,
                "A").find((a) => a.t === "play" && a.uid === card.uid && a.args?.actor === `A:${o.hero}` && (!targetId || a.args?.target === targetId))
        }
    } else {
        const card = new cg.Game(s).skillCard(o.hero,
            "A",
            o.key)
        s.players.A.hand.push(card)
        act = cg.legalActions(s,
            "A").find((a) => {
            if (a.t !== "play" || a.uid !== card.uid) return false
            const args = a.args ?? {
            }
            if (o.steal) return typeof args.pick === "string" && args.pick === `steal:${o.steal}:R`
            return !targetId || args.target === targetId
        })
    }
    if (!act) return empty

    const events: { ev: cg.GameEvent[]; phase: number }[] = []
    const settle = (state: cg.GameState, first: cg.GameEvent[], phase: number) => {
        let st = state
        const ev = [...first]
        while (st.phase === "chain" && st.chain) {
            const r = cg.applyAction(st,
                {
                    t: "pass", side: st.chain.priority
                })
            st = r.state
            ev.push(...r.events)
        }
        events.push({
            ev, phase
        })
        return st
    }
    let r = cg.applyAction(s,
        act)
    const after = settle(r.state,
        r.events,
        0)
    const end = cg.legalActions(after,
        "A").find((a) => a.t === "end")
    let endTurn = false
    if (end) {
        r = cg.applyAction(after,
            end)
        const before = events.length
        settle(r.state,
            r.events,
            1)
        endTurn = events.slice(before).some((x) => x.ev.some((e) => e.t === "damage" && e.src === `A:${o.hero}`))
    }

    const damage: SimDamage[] = []
    const heals: SimHeal[] = []
    const moves: SimMove[] = []
    const hits: SimHit[] = []
    const where = (id?: string) => {
        const u = id ? s.units[id] : undefined
        return u ? { side: (id!.startsWith("A:") ? "A" : "B") as "A" | "B", lane: u.lane } : undefined
    }
    for (const {
        ev, phase
    } of events) for (const e of ev) {
        // hồi máu 0 (đồng minh đầy máu) vẫn giữ: chặng nảy vẫn đi qua, chỉ không hiện số
        if ((e.t === "damage" && e.amount > 0) || e.t === "heal" || e.t === "shield") {
            const at = where(e.target)
            if (at) hits.push({
                kind: e.t, ...at, amount: e.amount, tag: e.t === "damage" ? e.tag : undefined, dmgKind: e.t === "damage" ? e.kind : undefined, via: e.t === "shield" ? undefined : where(e.via), phase
            })
        }
        if (e.t === "damage" && e.target.startsWith("B:")) damage.push({
            target: e.target, lane: s.units[e.target]?.lane ?? -1, side: "B", amount: e.amount, kind: e.kind, tag: e.tag, phase
        })
        else if (e.t === "move") moves.push({
            unit: e.unit, from: e.from, to: e.to, with: e.with
        })
        else if (e.t === "heal" && e.target === `A:${o.hero}`) heals.push({
            target: e.target, amount: e.amount, phase
        })
    }
    return {
        ok: true, damage, heals, moves, hits, endTurn
    }
}

/** Mô phỏng an toàn: engine ném lỗi (thế cờ demo không hợp lệ với chiêu) thì trả kết quả rỗng thay vì làm kẹt màn demo */
export function simulate(o: SimOptions): SimResult {
    try {
        return simulateInner(o)
    } catch (e) {
        console.log("[gal] simerr", o.hero, o.key, (e as Error).message)
        return {
            ok: false, damage: [], heals: [], moves: [], hits: [], endTurn: false
        }
    }
}
