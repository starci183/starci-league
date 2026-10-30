// Dò lỗi "kẹt nút": mô phỏng đúng luồng chọn của Hand.tsx (màu → lá bỏ → lá chọn → tướng tung → bấm mục tiêu/đường → nút mức)
// cho mọi lá trên tay ở mọi bước của nhiều trận bot, phủ đủ tướng. Nhánh nào còn > 1 hành động mà UI không phân biệt được = kẹt.
import {
    cg
} from "@starci/shared"
import {
    actionsForHandCard, targetsOf
} from "../packages/client/src/card/store"

type Action = cg.Action
const argsOf = (a: Action): cg.PlayArgs => ((a.t === "play" || a.t === "chain") ? a.args ?? {
} : {
})
const dedupe = (l: Action[]) => [...new Map(l.map((a) => [JSON.stringify(a),
    a])).values()]
const groupBy = (l: Action[], k: (x: cg.PlayArgs) => string | undefined) => {
    const m = new Map<string, Action[]>()
    for (const a of l) { const key = k(argsOf(a)) ?? ""; m.set(key,
        [...(m.get(key) ?? []),
            a]) }
    return m
}
const stuck = new Map<string, string>()
const seenCards = new Set<string>()

/** Trả về true nếu mọi hành động trong `options` đều chọn được qua UI */
function reach(options: Action[], label: string): void {
    options = dedupe(options)
    if (options.length <= 1) return
    for (const key of ["color",
        "discard",
        "pick"] as const) {
        const g = groupBy(options,
            (a) => {
                const v = a[key]
                return v === undefined ? undefined : Array.isArray(v) ? [...v].sort().join("+") : String(v)
            })
        if (g.size > 1) { for (const sub of g.values()) reach(sub,
            label); return }
    }
    const needsBoard = options.some((a) => { const x = argsOf(a); return !!x.target || !!x.targets?.length || x.lane !== undefined })
    const actors = groupBy(options,
        (a) => a.actor)
    if (actors.size > 1 && needsBoard) { for (const sub of actors.values()) reach(sub,
        label); return }
    // beginTargeting: bấm tướng/đường thu hẹp theo targetsOf
    const byTarget = new Map<string, Action[]>()
    for (const a of options) { const k = JSON.stringify(targetsOf(a)); byTarget.set(k,
        [...(byTarget.get(k) ?? []),
            a]) }
    const clickable = byTarget.size > 1 || options.some((a) => targetsOf(a).units.length || targetsOf(a).lanes.length)
    for (const [k,
        group] of byTarget) {
        if (group.length <= 1 && clickable) continue
        if (group.length <= 1) continue
        const confirms = group.length <= 8 && group.every((a) => (argsOf(a).targets?.length ?? 0) > 0)
        const lv = group.map((a) => argsOf(a).manaSpent ?? argsOf(a).amount)
        const levels = lv.every((v) => v !== undefined) && new Set(lv).size === group.length
        if (confirms || levels) continue
        const diff = group.slice(0,
            3).map((a) => JSON.stringify(argsOf(a))).join(" | ")
        if (!stuck.has(label)) stuck.set(label,
            `${group.length} lựa chọn cùng mục tiêu ${k}: ${diff}`)
    }
}

const heroes = cg.implementedHeroes().map((h) => h.id)
// Chạy: npx tsx scripts/ui_reach_tests.ts [số bước tối thiểu, mặc định 10000]
const target = Number(process.argv[2] ?? 10000)
let steps = 0, cases = 0, games = 0, finished = 0
const errors: string[] = []
const t0 = Date.now()
for (let gi = 0; steps < target; gi++) {
    const rot = (gi * 7) % heroes.length
    const pick = (o: number) => Array.from({
        length: 5
    },
    (_, i) => heroes[(rot + o + i * 3) % heroes.length])
    const seed = 1000 + gi
    const teamA = pick(0), teamB = pick(1)
    if (new Set([...teamA]).size < 5 || new Set([...teamB]).size < 5) continue
    let s = cg.newGame(seed,
        teamA,
        teamB)
    games++
    let n = 0
    try {
        for (; n < 3000 && s.phase !== "over"; n++) {
            const side = cg.whoseMove(s)
            const legal = cg.legalActions(s,
                side)
            if (!legal.length) throw new Error(`đến lượt ${side} (phase ${s.phase}) mà không có hành động hợp lệ`)
            if (s.phase === "main" || s.phase === "chain") {
                const sigs = new Set<string>()
                for (const card of s.players[side].hand) {
                    const opts = actionsForHandCard(legal,
                        s.players[side].hand,
                        card)
                    if (!opts.length) continue
                    const sig = `${card.kind}:${card.id}`
                    if (sigs.has(sig)) continue
                    sigs.add(sig)
                    seenCards.add(card.id)
                    cases++
                    reach(opts,
                        card.id)
                }
            }
            s = cg.applyAction(s,
                cg.chooseAction(s,
                    side,
                    "easy")).state
            steps++
        }
        if (s.phase === "over") finished++
        else errors.push(`seed ${seed} [${teamA}] vs [${teamB}]: không kết thúc sau ${n} hành động (vòng ${s.round})`)
    } catch (e) {
        errors.push(`seed ${seed} [${teamA}] vs [${teamB}] bước ${n} (vòng ${s.round}): ${(e as Error).message}`)
    }
}
const covered = heroes.filter((h) => [...seenCards].some((c) => c.startsWith(`${h}_`)))
console.log(`${games} trận (${finished} kết thúc), ${steps} bước, ${cases} lần kiểm lá; ${seenCards.size} loại lá; tướng có lá được thử: ${covered.length}/${heroes.length}; ${((Date.now() - t0) / 1000).toFixed(0)}s`)
if (covered.length < heroes.length) console.log(`Chưa thử: ${heroes.filter((h) => !covered.includes(h)).join(", ")}`)
let fail = false
if (stuck.size) {
    fail = true
    console.log(`KẸT ${stuck.size} lá:`)
    for (const [k,
        v] of stuck) console.log(`  ${k}: ${v}`)
}
if (errors.length) {
    fail = true
    console.log(`LỖI ENGINE ${errors.length}:`)
    for (const e of errors.slice(0,
        20)) console.log(`  ${e}`)
}
if (fail) process.exit(1)
console.log("PASS: không lá nào kẹt chọn trên UI, không lỗi engine")
