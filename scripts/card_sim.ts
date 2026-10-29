// Mô phỏng hàng loạt chế độ thẻ bài qua SERVER THẬT (phòng "card" với sim:true, 2 bot Khó, đội ngẫu nhiên).
// Chạy server trước (npm run dev), rồi: npx tsx scripts/card_sim.ts [số trận=40] [song song=4] [file json]
import {
    Client
} from "colyseus.js"
import {
    writeFileSync
} from "node:fs"

const URL = process.env.SERVER ?? "ws://localhost:2567"
const N = Number(process.argv[2] ?? 40), PAR = Number(process.argv[3] ?? 4), OUT = process.argv[4]
const TIMEOUT_MS = 120_000

type Stat = { winner: "A" | "B" | null; reason: string; round: number; turnNo: number; teams: { A: string[]; B: string[] }; lives: { A: number; B: number } | null; stats: Record<"A" | "B", { kills: number; damage: number; cardsPlayed: number }> | null; deaths: Record<string, number> | null };

async function one(): Promise<Stat | { timeout: true }> {
    const client = new Client(URL)
    const room = await client.create("card",
        {
            sim: true, fast: true, name: "sim"
        })
    return new Promise((resolve) => {
        const done = (r: Stat | { timeout: true }) => { clearTimeout(t); room.leave().catch(() => {}); resolve(r) }
        const t = setTimeout(() => done({
            timeout: true
        }),
        TIMEOUT_MS)
        room.onMessage("cg:simStats",
            (m) => done(m))
        for (const k of ["cg:state",
            "cg:events",
            "cg:legal",
            "cg:end",
            "cg:error",
            "cg:waiting",
            "cg:draft",
            "cg:picked"]) room.onMessage(k,
            () => {})
    })
}

const results: (Stat | { timeout: true })[] = []
let started = 0
async function worker() {
    while (started < N) {
        started++
        try { results.push(await one()) } catch (e) { console.error("\nlỗi trận:",
            (e as Error).message) }
        process.stdout.write(`\r${results.length}/${N} trận`)
    }
}
await Promise.all(Array.from({
    length: PAR
},
worker))
console.log()

const ended = results.filter((r): r is Stat => !("timeout" in r))
const decided = ended.filter((r) => r.winner)
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "-")
console.log(`Có kết quả: ${decided.length}/${results.length} (hết giờ/hoà/lỗi: ${results.length - decided.length})`)

const reasons = new Map<string, number>()
for (const r of ended) reasons.set(r.reason,
    (reasons.get(r.reason) ?? 0) + 1)
console.log("Lý do kết thúc:",
    Object.fromEntries(reasons))

const rounds = decided.map((r) => r.round).sort((a, b) => a - b)
if (rounds.length) {
    const q = (p: number) => rounds[Math.min(rounds.length - 1,
        Math.floor(p * rounds.length))]
    console.log(`Số vòng: trung vị ${q(0.5)} · 25% ${q(0.25)} · 75% ${q(0.75)} · min ${rounds[0]} · max ${rounds.at(-1)} · TB ${(rounds.reduce((s, x) => s + x,
        0) / rounds.length).toFixed(1)}`)
}
console.log(`Bên đi trước (A) thắng: ${decided.filter((r) => r.winner === "A").length}/${decided.length}`)

const by = new Map<string, { games: number; wins: number; deaths: number }>()
for (const r of decided) for (const side of ["A",
    "B"] as const) for (const h of r.teams[side]) {
    const a = by.get(h) ?? {
        games: 0, wins: 0, deaths: 0
    }
    a.games++; if (r.winner === side) a.wins++
    a.deaths += r.deaths?.[`${side}:${h}`] ?? 0
    by.set(h,
        a)
}
console.table([...by.entries()].sort((x, y) => y[1].wins / y[1].games - x[1].wins / x[1].games).map(([id,
    a]) => ({
    Tướng: id, "Số lần": a.games, "Tỉ lệ thắng": pct(a.wins,
        a.games), "Chết/trận": (a.deaths / a.games).toFixed(2),
})))
if (OUT) writeFileSync(OUT,
    JSON.stringify(results,
        null,
        1))
process.exit(0)
