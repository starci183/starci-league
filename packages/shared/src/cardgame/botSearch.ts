// Bot "hard": lập kế hoạch cả LƯỢT bằng beam search trên chuỗi hành động (applyAction trên bản sao), chấm điểm thế cờ
// CUỐI LƯỢT (sau khi kết thúc lượt: đấu sĩ tự đánh, hook cuối lượt, trạng thái hết hạn, đầu lượt địch) bằng botEval.
// Nhờ vậy tìm được combo trong lượt: gắn dấu rồi kích nổ, ghép rồi đeo đồ, gọi tướng rồi tung chiêu, đặt thùng rồi chờ.
// Chuỗi (Quick) mở ra trong lúc tìm được giải quyết bằng phản ứng tham lam của đối thủ (botGreedy), không phải bỏ qua.
// Không nhìn trộm: mọi mô phỏng chạy trên determinize() (botView.ts). Kế hoạch được giữ trong lượt, lệch thì lập lại.
import {
    chooseActionGreedy
} from "./botGreedy"
import {
    evaluate, summonLaneFit, summonValue
} from "./botEval"
import {
    determinize, fingerprint, seesHand
} from "./botView"
import {
    actorsOf, applyAction, legalActions, skillOfCard
} from "./engine"
import {
    Game
} from "./game"
import {
    otherSide,
    type Action, type Card, type GameState, type Side
} from "./types"

export interface SearchConfig {
    /** Số nhánh giữ lại mỗi tầng */
    width: number;
    /** Số hành động tối đa trong một kế hoạch (không tính kết thúc lượt) */
    maxDepth: number;
    /** Ngân sách applyAction cho một lần lập kế hoạch (tất định, không theo đồng hồ) */
    maxApplies: number;
    /** Số con tối đa thử từ mỗi nút (sau khi gộp hành động tương đương) */
    maxChildren: number;
    /** Số kế hoạch tốt nhất được chấm lại sau khi mô phỏng nguyên lượt đáp trả (tham lam) của đối thủ; 0 = tắt */
    replyTop: number;
    /** Xếp hạng nhánh theo điểm cuối lượt (tốn thêm 1 applyAction mỗi nhánh) thay vì điểm tĩnh giữa lượt */
    leafRank: boolean;
}
export const HARD_SEARCH: SearchConfig = {
    width: 4, maxDepth: 10, maxApplies: 900, maxChildren: 40, replyTop: 0, leafRank: true
}

interface Step {
    /** dấu vân tay state (phần nhìn thấy) ngay trước hành động */
    fp: string;
    action: Action;
    /** tay của bot lúc đó trong mô phỏng (đổi uid sang tay thật theo vị trí) */
    hand: Card[];
}
interface Node {
    s: GameState; steps: Step[]; score: number; leaf: boolean;
    /** điều chỉnh kỳ vọng cộng dồn (đối thủ có thể không có lá Quick để đáp trả như trong mẫu) */
    adj: number;
}

export interface SearchStats { plans: number; applies: number; cacheHits: number }
export const searchStats: SearchStats = {
    plans: 0, applies: 0, cacheHits: 0
}

/** Lá Quick của tướng đang trên sân (đáp trả được khi có chuỗi) */
/** Pháp sư chỉ đáp được khi còn đủ mana cho lá đó */
function isLiveQuick(s: GameState, c: Card): boolean {
    const def = c.kind === "skill" ? skillOfCard(c) : undefined
    const u = s.units[`${c.side}:${c.hero}`]
    if (!def?.quick || !u || u.status !== "board") return false
    const g = new Game(s)
    return !g.isMage(u) || g.manaOf(u) >= g.manaCost(u,
        def,
        c)
}

/**
 * Xác suất đối thủ của `viewer` đang cầm ít nhất 1 lá Quick dùng được, chỉ từ thông tin công khai: thành phần bài chưa
 * thấy của họ (tay + bộ) và số lá trên tay. Đang thấy tay (see_hand) thì biết chắc.
 */
export function quickResponseProb(real: GameState, viewer: Side): number {
    const p = real.players[otherSide(viewer)]
    if (seesHand(real,
        viewer)) return p.hand.some((c) => isLiveQuick(real,
        c)) ? 1 : 0
    let K = 0
    for (const c of p.hand) if (isLiveQuick(real,
        c)) K++
    for (const c of p.deck) if (isLiveQuick(real,
        c)) K++
    const N = p.hand.length + p.deck.length
    let none = 1
    for (let i = 0; i < p.hand.length; i++) none *= Math.max(0,
        N - K - i) / Math.max(1,
        N - i)
    return 1 - none
}

class Sim {
    applies = 0
    /** Xác suất đối thủ có lá Quick (quickResponseProb của state thật) */
    respondProb = 1
    constructor(public side: Side) {}
    apply(s: GameState, a: Action): GameState {
        this.applies++
        return applyAction(s,
            a).state
    }
    /** Giải quyết chuỗi đang mở: đối thủ đáp bằng bot tham lam, bot thì bỏ qua (đã chọn lá của mình rồi) */
    settle(s: GameState): GameState {
        for (let i = 0; s.phase === "chain" && s.chain && i < 12; i++) {
            const mover = s.chain.priority
            const a: Action = mover === this.side ? {
                t: "pass", side: mover
            } : chooseActionGreedy(s,
                mover)
            s = this.apply(s,
                a)
        }
        return s
    }
    /**
     * Giải quyết chuỗi khi đối thủ đang có quyền đáp: mẫu tay đối thủ có lá Quick nhưng thật ra họ chỉ có lá đó với xác
     * suất respondProb, nên giá trị = trung bình có trọng số của nhánh "đáp tham lam" và nhánh "bỏ qua".
     * Trả về state đi tiếp (nhánh khả dĩ hơn) và độ lệch kỳ vọng so với state đó.
     */
    settleExpected(s: GameState): { s: GameState; adj: number } {
        if (s.phase !== "chain" || !s.chain || s.chain.priority === this.side) return {
            s: this.settle(s), adj: 0
        }
        const p = this.respondProb
        const sR = this.settle(s)
        if (p >= 0.999) return {
            s: sR, adj: 0
        }
        const sP = this.settle(this.apply(s,
            {
                t: "pass", side: s.chain.priority
            }))
        const vR = evaluate(sR,
                this.side), vP = evaluate(sP,
                this.side)
        const ev = p * vR + (1 - p) * vP
        return p >= 0.5 ? {
            s: sR, adj: ev - vR
        } : {
            s: sP, adj: ev - vP
        }
    }
    /** Kết thúc lượt để chấm điểm: bước gọi tướng thì rút bài; rồi kết thúc lượt */
    finish(s: GameState): GameState {
        s = this.settle(s)
        if (s.phase === "summon" && s.active === this.side) s = this.apply(s,
            {
                t: "draw", side: this.side
            })
        if (s.phase === "main" && s.active === this.side) s = this.apply(s,
            {
                t: "end", side: this.side
            })
        return s
    }
    /** Từ cuối lượt của bot: đối thủ chơi trọn lượt của họ bằng bot tham lam (bot bỏ qua mọi cửa sổ chuỗi) */
    opponentTurn(s: GameState): GameState {
        for (let i = 0; i < 60 && s.phase !== "over" && !(s.active === this.side && s.phase !== "chain"); i++) {
            const mover = s.phase === "chain" && s.chain ? s.chain.priority : s.active
            const a: Action = mover === this.side ? {
                t: "pass", side: mover
            } : chooseActionGreedy(s,
                mover)
            s = this.apply(s,
                a)
        }
        return s
    }
}

/** Giá trị lá bỏ: lá tạm = 0, lá chiêu chết = 1 */
const cardCost = (c: Card | undefined, g: Game) => (!c ? 0 : c.temp ? 0 : c.kind === "skill" && g.isDeadCard(c) ? 1 : c.kind === "skill" ? 5 : c.id === "legend" ? 6 : c.id === "gold" || c.id === "item" ? 3 : c.id === "basic" ? 2 : 4)

/** Hành động đáng thử: bỏ end/pass/draw; gộp lựa chọn chỉ khác lá bỏ (giữ lá bỏ rẻ nhất) và tập mục tiêu (giữ tập lớn nhất) */
export function candidateActions(s: GameState, side: Side): Action[] {
    const legal = legalActions(s,
        side)
    const hand = s.players[side].hand
    const gm = new Game(s)
    const groups = new Map<string, { a: Action; cost: number; size: number }>()
    const out: Action[] = []
    for (const a of legal) {
        if (a.t === "end" || a.t === "pass" || a.t === "draw" || a.t === "ready") continue
        if (a.t !== "play" || !a.args) { out.push(a); continue }
        const x = a.args
        if (!x.discard?.length && !x.targets) { out.push(a); continue }
        const key = JSON.stringify([a.uid,
            x.actor,
            x.target,
            x.lane,
            x.color,
            x.pick,
            x.discard?.length ?? 0])
        const cost = x.discard?.length ? cardCost(hand.find((c) => c.uid === x.discard![0]),
            gm) : 0
        const size = x.targets?.length ?? 0
        const prev = groups.get(key)
        if (!prev || size > prev.size || (size === prev.size && cost < prev.cost)) groups.set(key,
            {
                a, cost, size
            })
    }
    for (const g of groups.values()) out.push(g.a)
    // tách riêng đòn không cần lá (cardless) và đòn miễn phí: khoá sameAction đã gồm trường cardless
    return out
}

/** Lập kế hoạch cả lượt cho `side` (state đang ở lượt của side, phase summon/main). Trả về chuỗi bước, bước cuối là draw/end. */
export function planTurn(real: GameState, side: Side, cfg: SearchConfig = HARD_SEARCH): Step[] {
    const root = determinize(real,
        side,
        1)
    const sim = new Sim(side)
    sim.respondProb = quickResponseProb(real,
        side)
    const finishAction = (s: GameState): Action => ({
        t: s.phase === "summon" ? "draw" : "end", side
    })
    const leaves: { n: Node; v: number; end?: GameState }[] = []
    const leafValue = (n: Node): number => {
        if (n.s.phase === "over") { leaves.push({
            n, v: n.score
        }); return n.score }
        try {
            const end = sim.finish(n.s)
            const v = evaluate(end,
                side) + n.adj
            leaves.push({
                n, v, end
            })
            return v
        } catch {
            return -Infinity
        }
    }
    const rootNode: Node = {
        s: root, steps: [], score: evaluate(root,
            side), leaf: false, adj: 0
    }
    let best = rootNode
    let bestVal = leafValue(rootNode)
    let beam: Node[] = [rootNode]
    for (let depth = 0; depth < cfg.maxDepth && beam.length && sim.applies < cfg.maxApplies; depth++) {
        const kids = new Map<string, Node>()
        for (const node of beam) {
            const s = node.s
            if (s.phase === "over" || s.active !== side || (s.phase !== "main" && s.phase !== "summon")) continue
            const fp = fingerprint(s,
                side)
            // bước gọi tướng: không cắt bớt (tối đa 5 tướng x đường mở)
            const all = candidateActions(s,
                side)
            const cands = s.phase === "summon" ? all : all.slice(0,
                cfg.maxChildren)
            for (const a of cands) {
                if (sim.applies >= cfg.maxApplies) break
                let r: { s: GameState; adj: number }
                try {
                    r = sim.settleExpected(sim.apply(s,
                        a))
                } catch {
                    continue
                }
                const s2 = r.s
                const adj = node.adj + r.adj
                const score = evaluate(s2,
                    side) + adj
                const kid: Node = {
                    s: s2, steps: [...node.steps,
                        {
                            fp, action: a, hand: s.players[side].hand
                        }], score, leaf: s2.phase === "over", adj
                }
                const key = fingerprint(s2,
                    side)
                const prev = kids.get(key)
                if (!prev || prev.score < score) kids.set(key,
                    kid)
            }
        }
        let next: Node[]
        if (cfg.leafRank) {
            const scored = [...kids.values()].map((n) => ({
                n, v: leafValue(n)
            }))
            for (const x of scored) if (x.v > bestVal) { bestVal = x.v; best = x.n }
            next = scored.sort((a, b) => b.v - a.v).slice(0,
                cfg.width).map((x) => x.n)
        } else {
            next = [...kids.values()].sort((a, b) => b.score - a.score).slice(0,
                cfg.width)
            for (const n of next) {
                const v = leafValue(n)
                if (v > bestVal) { bestVal = v; best = n }
            }
        }
        beam = next.filter((n) => !n.leaf)
    }
    // chấm lại vài kế hoạch tốt nhất bằng cách cho đối thủ đáp trả trọn một lượt
    if (cfg.replyTop > 0 && best.s.phase !== "over") {
        const top = leaves.filter((x) => x.end).sort((a, b) => b.v - a.v).slice(0,
            cfg.replyTop)
        let bestReply = -Infinity
        for (const x of top) {
            let v: number
            try {
                v = evaluate(sim.opponentTurn(x.end!),
                    side) + x.n.adj
            } catch {
                continue
            }
            if (v > bestReply) { bestReply = v; best = x.n }
        }
    }
    searchStats.plans++
    searchStats.applies += sim.applies
    const steps = [...best.steps]
    if (best.s.phase !== "over") steps.push({
        fp: fingerprint(best.s,
            side), action: finishAction(best.s), hand: best.s.players[side].hand
    })
    return steps
}

/** Đổi uid lá trong hành động từ tay mô phỏng sang tay thật (cùng vị trí, cùng loại lá); áp cho mọi trường chuỗi của hành động */
function remap(a: Action, simHand: Card[], realHand: Card[]): Action {
    const idx = new Map<string, number>()
    simHand.forEach((c, i) => idx.set(c.uid,
        i))
    const map = (x: unknown): unknown => {
        if (typeof x === "string") {
            const i = idx.get(x)
            return i !== undefined && realHand[i] ? realHand[i].uid : x
        }
        if (Array.isArray(x)) return x.map(map)
        if (x && typeof x === "object") {
            const o: Record<string, unknown> = {
            }
            for (const [k,
                v] of Object.entries(x)) o[k] = k === "t" || k === "side" ? v : map(v)
            return o
        }
        return x
    }
    return map(a) as Action
}

interface Plan { steps: Step[]; idx: number; turnNo: number }
const plans = new Map<string, Plan>()
/** So hai hành động không phụ thuộc thứ tự khoá */
const keyOf = (x: unknown): string => {
    if (Array.isArray(x)) return `[${x.map(keyOf).join(",")}]`
    if (x && typeof x === "object") return `{${Object.keys(x).sort().map((k) => `${k}:${keyOf((x as Record<string, unknown>)[k])}`).join(",")}}`
    return JSON.stringify(x) ?? "u"
}
const sameAction = (a: Action, b: Action) => keyOf(a) === keyOf(b)

/** Quyết định khi đang có chuỗi và `side` có quyền nối: thử bỏ qua và từng lá Quick, chấm thế cờ sau khi chuỗi giải quyết */
function chainDecision(real: GameState, side: Side): Action {
    const legal = legalActions(real,
        side)
    const pass = legal.find((a) => a.t === "pass") ?? legal[0]
    if (legal.length <= 1) return pass
    const view = determinize(real,
        side,
        2)
    const sim = new Sim(side)
    sim.respondProb = quickResponseProb(real,
        side)
    const value = (a: Action) => {
        try {
            const r = sim.settleExpected(sim.apply(view,
                a))
            return evaluate(r.s,
                side) + r.adj
        } catch {
            return -Infinity
        }
    }
    let best = pass
    let bestVal = value(pass) + 15 // giữ lá Quick nếu lợi ích không rõ
    for (const a of candidateActions(view,
        side)) {
        const v = value(a)
        if (v > bestVal) { bestVal = v; best = a }
    }
    searchStats.applies += sim.applies
    return closestLegal(best,
        legal)
}

/**
 * Bước gọi tướng úp đồng thời: chỉ có tay mình + sân công khai, KHÔNG biết đối thủ gọi ai (determinize che lựa chọn úp của họ).
 * Tướng: summonValue cao nhất (tay bài quyết định). Đường: mô phỏng gọi vào từng đường, đối thủ gọi mẫu ngẫu nhiên
 * (bot tham lam), chấm thế cờ trung bình trên vài mẫu + summonLaneFit.
 */
function blindDecision(real: GameState, side: Side): Action {
    const legal = legalActions(real,
        side)
    const summons = legal.filter((a): a is Extract<Action, { t: "summon" }> => a.t === "summon")
    const ready = legal.find((a) => a.t === "ready") ?? legal[0]
    if (!summons.length) return ready
    let hero = summons[0].hero
    let bestV = -Infinity
    for (const a of summons) {
        const v = summonValue(real,
            side,
            a.hero)
        if (v > bestV) { bestV = v; hero = a.hero }
    }
    const lanes = summons.filter((a) => a.hero === hero)
    if (lanes.length === 1) return lanes[0]
    const views = [3,
        4,
        5].map((salt) => determinize(real,
        side,
        salt))
    let best = lanes[0]
    let bestVal = -Infinity
    for (const a of lanes) {
        let sum = 0
        for (const view of views) {
            try {
                let s = applyAction(view,
                    a).state
                for (let i = 0; i < 6 && s.phase === "blind"; i++) {
                    const mover = actorsOf(s)[0]
                    if (!mover) break
                    s = applyAction(s,
                        chooseActionGreedy(s,
                            mover)).state
                }
                sum += evaluate(s,
                    side)
            } catch {
                sum += -1e6
            }
        }
        const v = sum / views.length + summonLaneFit(real,
            side,
            hero,
            a.lane)
        if (v > bestVal) { bestVal = v; best = a }
    }
    return best
}

/** Bot "hard": hành động kế tiếp cho `side` (bên đang phải quyết định) */
export function chooseActionSearch(real: GameState, side: Side, cfg: SearchConfig = HARD_SEARCH): Action {
    if (real.phase === "chain") return chainDecision(real,
        side)
    if (real.phase === "blind") return blindDecision(real,
        side)
    const key = `${real.seed}:${side}`
    const legal = legalActions(real,
        side)
    const plan = plans.get(key)
    if (plan && plan.turnNo === real.turnNo) {
        const fp = fingerprint(real,
            side)
        for (let k = plan.idx; k < plan.steps.length; k++) {
            if (plan.steps[k].fp !== fp) continue
            const a = remap(plan.steps[k].action,
                plan.steps[k].hand,
                real.players[side].hand)
            if (legal.some((x) => sameAction(x,
                a))) {
                plan.idx = k + 1
                searchStats.cacheHits++
                return a
            }
            break
        }
    }
    const steps = planTurn(real,
        side,
        cfg)
    const first = steps[0] ? steps[0].action : legal[legal.length - 1]
    if (plans.size > 256) plans.clear()
    plans.set(key,
        {
            steps, idx: 1, turnNo: real.turnNo
        })
    return closestLegal(first,
        legal)
}

/**
 * Hành động hợp lệ gần nhất với hành động đã lập trên thế giới giả định. Khác nhau khi kế hoạch nhắm vào phần ẩn
 * (vd chọn 1 lá trong tay đối thủ mẫu): giữ cùng loại hành động + cùng lá, khớp nhiều tham số nhất.
 */
function closestLegal(a: Action, legal: Action[]): Action {
    if (legal.some((x) => sameAction(x,
        a))) return a
    const uidOf = (x: Action) => ("uid" in x ? x.uid : undefined)
    const argsOf = (x: Action): Record<string, unknown> => ("args" in x && x.args ? x.args as Record<string, unknown> : {
    })
    let best: Action | undefined
    let bestMatch = -1
    for (const x of legal) {
        if (x.t !== a.t || uidOf(x) !== uidOf(a)) continue
        const ax = argsOf(a), xx = argsOf(x)
        let m = 0
        for (const k of Object.keys(ax)) if (keyOf(ax[k]) === keyOf(xx[k])) m++
        if (m > bestMatch) { bestMatch = m; best = x }
    }
    return best ?? legal.find((x) => x.t === "end" || x.t === "draw") ?? legal[0]
}
