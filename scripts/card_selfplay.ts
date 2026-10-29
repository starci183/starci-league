// Mô phỏng HEADLESS chế độ thẻ bài: N trận bot-vs-bot (không cần server). Đội ngẫu nhiên trong các tướng đã viết xong.
// Chạy: npx tsx scripts/card_selfplay.ts [số trận=200] [cỡ đội=5] [seed gốc=1] [--heroes=darius,nami] [--verbose]
import {
    cg
} from "@starci/shared"

const args = process.argv.slice(2)
const flag = (name: string) => args.find((a) => a.startsWith(`--${name}`))?.split("=")[1]
const pos = args.filter((a) => !a.startsWith("--"))
const N = Number(pos[0] ?? 200), TEAM = Number(pos[1] ?? 5), SEED0 = Number(pos[2] ?? 1)
const VERBOSE = args.includes("--verbose")
const ROUND_CAP = 150, STEP_CAP = 30000

const pool = flag("heroes") ? flag("heroes")!.split(",") : cg.implementedHeroes().map((h) => h.id)
if (pool.length === 0) throw new Error("Chưa có tướng nào viết xong")
const size = Math.min(TEAM,
    pool.length)

// RNG riêng của script để chọn đội (tách khỏi rng của trận)
let r = SEED0 >>> 0
const rnd = () => { r = (r + 0x6d2b79f5) >>> 0; let t = r; t = Math.imul(t ^ (t >>> 15),
    t | 1); t ^= t + Math.imul(t ^ (t >>> 7),
    t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
const randomTeam = () => { const a = [...pool]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i],
    a[j]] = [a[j],
    a[i]] } return a.slice(0,
    size) }

type HeroStat = { games: number; wins: number; kills: number; deaths: number; damage: number };
const byHero = new Map<string, HeroStat>()
const hs = (id: string) => { let s = byHero.get(id); if (!s) byHero.set(id, (
    s = {
        games: 0, wins: 0, kills: 0, deaths: 0, damage: 0
    })); return s }
const reasons: Record<string, number> = {
    lives: 0, deck: 0, timeout: 0
}
const rounds: number[] = []
let winsA = 0, errors = 0
const t0 = Date.now()

for (let i = 0; i < N; i++) {
    const teamA = randomTeam(), teamB = randomTeam()
    let state = cg.newGame(SEED0 * 100000 + i,
        teamA,
        teamB)
    let steps = 0
    try {
        while (state.phase !== "over" && steps++ < STEP_CAP && state.round <= ROUND_CAP) {
            const side = cg.whoseMove(state)
            const action = cg.chooseAction(state,
                side)
            const res = cg.applyAction(state,
                action)
            if (VERBOSE) for (const e of res.events) if (e.t === "kill" || e.t === "end" || e.t === "summon") console.log(`  [r${state.round}${state.active}]`,
                JSON.stringify(e))
            state = res.state
        }
    } catch (err) {
        errors++
        console.error(`Trận ${i} lỗi (A=${teamA} B=${teamB}):`,
            err)
        continue
    }
    if (state.phase !== "over") { reasons.timeout++; rounds.push(state.round); continue }
    reasons[state.endReason!]++
    rounds.push(state.round)
    if (state.winner === "A") winsA++
    for (const side of cg.SIDES) {
        for (const h of state.players[side].heroes) {
            const u = state.units[`${side}:${h}`], st = hs(h)
            st.games++; if (state.winner === side) st.wins++
            st.deaths += u.deaths
        }
    }
    if (VERBOSE) console.log(`Trận ${i}: A=${teamA} B=${teamB} -> thắng ${state.winner} (${state.endReason}) vòng ${state.round}, mạng A=${state.players.A.lives} B=${state.players.B.lives}`)
}

const done = rounds.length
const avg = rounds.reduce((a, b) => a + b,
    0) / (done || 1)
const sorted = [...rounds].sort((a, b) => a - b)
console.log(`\n=== ${N} trận thẻ bài, đội ${size} tướng, pool [${pool.join(", ")}], ${((Date.now() - t0) / 1000).toFixed(1)}s ===`)
console.log(`Kết thúc: 7 mạng ${reasons.lives}, cạn bài ${reasons.deck}, quá giới hạn ${reasons.timeout}, lỗi ${errors}`)
console.log(`Số vòng: TB ${avg.toFixed(1)}, min ${sorted[0]}, trung vị ${sorted[Math.floor(done / 2)]}, max ${sorted[done - 1]}`)
console.log(`Bên đi trước (A) thắng: ${((winsA / Math.max(1,
    N - errors - reasons.timeout)) * 100).toFixed(1)}%`)
console.log("Tỉ lệ thắng theo tướng (mỗi lần xuất hiện trong đội):")
for (const [id,
    s] of [...byHero].sort((a, b) => b[1].wins / b[1].games - a[1].wins / a[1].games))
    console.log(`  ${id.padEnd(14)} ${((s.wins / s.games) * 100).toFixed(1).padStart(5)}%  (${s.games} lần, chết TB ${(s.deaths / s.games).toFixed(1)})`)
if (errors || reasons.timeout) process.exitCode = 1
