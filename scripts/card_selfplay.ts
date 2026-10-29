// Mô phỏng HEADLESS chế độ thẻ bài: N trận bot-vs-bot (không cần server). Đội ngẫu nhiên trong các tướng đã viết xong.
// Chạy: npx tsx scripts/card_selfplay.ts [số trận=200] [cỡ đội=5] [seed gốc=1] [--heroes=darius,nami] [--verbose] [--jobs=8]
// --jobs=N chia trận cho N tiến trình con (kết quả giống hệt chạy tuần tự vì mỗi trận tất định theo chỉ số).
// --bot=easy|hard: mức bot cả hai bên (mặc định hard: lập kế hoạch cả lượt, botSearch.ts; easy = tham lam 1 nước cũ).
// --h2h=hard:easy: đối đầu hai mức bot, đổi bên mỗi trận (trận chẵn A = mức đầu); in tỉ lệ thắng của mức đầu.
// --draft: đội do bot cấm/chọn (botDraft.ts, 2 cấm mỗi bên) thay vì ngẫu nhiên. --pairs: bảng cặp combo/khắc chế.
import {
    spawn
} from "node:child_process"
import {
    fileURLToPath
} from "node:url"
import {
    cg
} from "@starci/shared"

const args = process.argv.slice(2)
const flag = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1]
const pos = args.filter((a) => !a.startsWith("--"))
const N = Number(pos[0] ?? 200), TEAM = Number(pos[1] ?? 5), SEED0 = Number(pos[2] ?? 1)
const VERBOSE = args.includes("--verbose")
const JOBS = Number(flag("jobs") ?? 1)
const RANGE = flag("range")?.split(":").map(Number)
const JSON_OUT = args.includes("--json")
const ROUND_CAP = 150, STEP_CAP = 30000
const LEVELS = ["easy",
    "hard"] as const
type Level = typeof LEVELS[number];
const asLevel = (x: string | undefined, d: Level): Level => (LEVELS.includes(x as Level) ? x as Level : d)
const BOT = asLevel(flag("bot"),
    "hard")
const H2H = flag("h2h")?.split(":").map((x) => asLevel(x,
    "easy"))
const DRAFT = args.includes("--draft")
/** Mức bot của mỗi bên ở trận i */
const levelsOf = (i: number): Record<"A" | "B", Level> => (H2H ? (i % 2 === 0 ? {
    A: H2H[0], B: H2H[1]
} : {
    A: H2H[1], B: H2H[0]
}) : {
    A: BOT, B: BOT
})

const pool = flag("heroes") ? flag("heroes")!.split(",") : cg.implementedHeroes().map((h) => h.id)
if (pool.length === 0) throw new Error("Chưa có tướng nào viết xong")
const size = Math.min(TEAM,
    pool.length)

type HeroStat = { games: number; wins: number; deaths: number };
type PairStat = { games: number; wins: number };
type Result = { byHero: Record<string, HeroStat>; reasons: Record<string, number>; rounds: number[]; winsA: number; errors: number; pairs: Record<string, PairStat>; h2hWins: number; h2hGames: number; ms: number; plans: number; applies: number; hits: number; v2: Record<string, number> };
const PAIRS = args.includes("--pairs")
const COMBOS = cg.comboPairs()
const COUNTERS = cg.counterPairs()

// RNG riêng của script để chọn đội (tách khỏi rng của trận)
let r = SEED0 >>> 0
const rnd = () => { r = (r + 0x6d2b79f5) >>> 0; let t = r; t = Math.imul(t ^ (t >>> 15),
    t | 1); t ^= t + Math.imul(t ^ (t >>> 7),
    t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
/** Đội ngẫu nhiên; tránh 2 tướng cùng dùng Ô triệu hồi phụ (bỏ tướng trùng ô, lấy tướng kế tiếp) */
const randomTeam = () => {
    const a = [...pool]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i],
        a[j]] = [a[j],
        a[i]] }
    const out: string[] = []
    for (const h of a) { if (out.length >= size) break; if (!cg.clashesExtraZone([...out,
        h])) out.push(h) }
    return out
}
/** Hai đội do bot cấm/chọn: 2 cấm mỗi bên (A B A B), rồi chọn kiểu rắn A · B B · A A ... (giống CardRoom) */
const draftTeams = (): [string[], string[]] => {
    const picks: Record<"A" | "B", string[]> = {
        A: [], B: []
    }
    const bans: string[] = []
    const order: ["A" | "B", "ban" | "pick"][] = []
    for (let i = 0; i < 4; i++) order.push([i % 2 === 0 ? "A" : "B",
        "ban"])
    for (let i = 0; i < size * 2; i++) order.push([Math.floor((i + 1) / 2) % 2 === 0 ? "A" : "B",
        "pick"])
    for (const [side,
        action] of order) {
        const available = pool.filter((h) => !bans.includes(h) && !picks.A.includes(h) && !picks.B.includes(h))
        const h = cg.draftChoice({
            available, mine: picks[side], theirs: picks[side === "A" ? "B" : "A"], action, noise: 1.5, rnd
        })
        if (!h) break
        if (action === "ban") bans.push(h)
        else picks[side].push(h)
    }
    return [picks.A,
        picks.B]
}

type GEv = { t: string; reason?: string; delta?: number; free?: boolean; cardless?: boolean };
/** Thống kê V2: lượt, đòn đánh tính giới hạn, mana bỏ phí khi đầy, lá bị đốt do tay đầy, đòn không cần lá */
function countV2(v: Record<string, number>, e: GEv) {
    const inc = (k: string, n = 1) => { v[k] = (v[k] ?? 0) + n }
    if (e.t === "turnStart") inc("turns")
    else if (e.t === "attackCount") inc("counted")
    else if (e.t === "cardBurned") inc("burned")
    else if (e.t === "attack" && e.cardless) inc("cardless")
    else if (e.t === "manaChange" && e.reason === "turn") {
        inc("manaRegens")
        const regen = cg.RULES.mage?.manaRegen ?? 0
        inc("manaWasted",
            Math.max(0,
                regen - (e.delta ?? 0)))
        inc("manaRegenMax",
            regen)
    }
}

function runRange(from: number, to: number): Result {
    const res: Result = {
        byHero: {
        }, reasons: {
            lives: 0, deck: 0, timeout: 0
        }, rounds: [], winsA: 0, errors: 0, pairs: {
        }, h2hWins: 0, h2hGames: 0, ms: 0, plans: 0, applies: 0, hits: 0, v2: {
        }
    }
    const t0 = Date.now()
    const st0 = {
        ...cg.searchStats
    }
    const ps = (k: string) => (res.pairs[k] ??= {
        games: 0, wins: 0
    })
    const hs = (id: string) => (res.byHero[id] ??= {
        games: 0, wins: 0, deaths: 0
    })
    for (let i = 0; i < to; i++) {
        const [teamA,
            teamB] = DRAFT ? draftTeams() : [randomTeam(),
            randomTeam()]
        const lv = levelsOf(i)
        if (i < from) continue
        let state = cg.newGame(SEED0 * 100000 + i,
            teamA,
            teamB)
        let steps = 0
        try {
            while (state.phase !== "over" && steps++ < STEP_CAP && state.round <= ROUND_CAP) {
                const side = cg.whoseMove(state)
                const action = cg.chooseAction(state,
                    side,
                    lv[side])
                const out = cg.applyAction(state,
                    action)
                for (const e of out.events as GEv[]) countV2(res.v2,
                    e)
                if (VERBOSE) for (const e of out.events) if (e.t === "kill" || e.t === "end" || e.t === "summon") console.log(`  [r${state.round}${state.active}]`,
                    JSON.stringify(e))
                state = out.state
            }
        } catch (err) {
            res.errors++
            console.error(`Trận ${i} lỗi (A=${teamA} B=${teamB}):`,
                err)
            continue
        }
        if (state.phase !== "over") { res.reasons.timeout++; res.rounds.push(state.round); continue }
        { const g = new cg.Game(state); for (const sd of cg.SIDES) { res.v2.boardSum = (res.v2.boardSum ?? 0) + g.heroes(sd).length; res.v2.boardN = (res.v2.boardN ?? 0) + 1 } }
        res.reasons[state.endReason!]++
        res.rounds.push(state.round)
        if (state.winner === "A") res.winsA++
        if (H2H) { res.h2hGames++; if (state.winner && lv[state.winner] === H2H[0]) res.h2hWins++ }
        for (const side of cg.SIDES) {
            for (const h of state.players[side].heroes) {
                const st = hs(h)
                st.games++; if (state.winner === side) st.wins++
                st.deaths += state.units[`${side}:${h}`].deaths
            }
        }
        for (const [side,
            mine,
            theirs] of [["A",
                teamA,
                teamB],
            ["B",
                teamB,
                teamA]] as const) {
            const won = state.winner === side ? 1 : 0
            for (const [a,
                b] of COMBOS) if (mine.includes(a) && mine.includes(b)) { const x = ps(`combo:${a}+${b}`); x.games++; x.wins += won }
            for (const [c,
                v] of COUNTERS) if (mine.includes(c) && theirs.includes(v)) { const x = ps(`counter:${c}>${v}`); x.games++; x.wins += won }
        }
        if (VERBOSE) console.log(`Trận ${i} [${lv.A}/${lv.B}]: A=${teamA} B=${teamB} -> thắng ${state.winner} (${state.endReason}) vòng ${state.round}, mạng A=${state.players.A.lives} B=${state.players.B.lives}`)
    }
    res.ms = Date.now() - t0
    res.plans = cg.searchStats.plans - st0.plans
    res.applies = cg.searchStats.applies - st0.applies
    res.hits = cg.searchStats.cacheHits - st0.cacheHits
    return res
}

function merge(list: Result[]): Result {
    const out: Result = {
        byHero: {
        }, reasons: {
            lives: 0, deck: 0, timeout: 0
        }, rounds: [], winsA: 0, errors: 0, pairs: {
        }, h2hWins: 0, h2hGames: 0, ms: 0, plans: 0, applies: 0, hits: 0, v2: {
        }
    }
    for (const x of list) {
        out.h2hWins += x.h2hWins; out.h2hGames += x.h2hGames; out.ms += x.ms
        for (const [k,
            n] of Object.entries(x.v2)) out.v2[k] = (out.v2[k] ?? 0) + n
        out.plans += x.plans; out.applies += x.applies; out.hits += x.hits
        for (const [k,
            v] of Object.entries(x.pairs)) { const t = (out.pairs[k] ??= {
            games: 0, wins: 0
        }); t.games += v.games; t.wins += v.wins }
        for (const [k,
            v] of Object.entries(x.reasons)) out.reasons[k] = (out.reasons[k] ?? 0) + v
        out.rounds.push(...x.rounds); out.winsA += x.winsA; out.errors += x.errors
        for (const [h,
            s] of Object.entries(x.byHero)) {
            const t = (out.byHero[h] ??= {
                games: 0, wins: 0, deaths: 0
            })
            t.games += s.games; t.wins += s.wins; t.deaths += s.deaths
        }
    }
    return out
}

function runChild(from: number, to: number): Promise<Result> {
    const self = fileURLToPath(import.meta.url)
    const childArgs = [self,
        String(N),
        String(TEAM),
        String(SEED0),
        `--range=${from}:${to}`,
        "--json",
        ...args.filter((a) => a.startsWith("--heroes=") || a.startsWith("--bot=") || a.startsWith("--h2h=") || a === "--pairs" || a === "--draft")]
    return new Promise((resolve, reject) => {
        const p = spawn(process.execPath,
            ["--import",
                "tsx",
                ...childArgs],
            {
                stdio: ["ignore",
                    "pipe",
                    "inherit"]
            })
        let buf = ""
        p.stdout.on("data",
            (d) => { buf += d })
        p.on("close",
            (code) => {
                const line = buf.split("\n").find((l) => l.startsWith("@@JSON"))
                if (!line) reject(new Error(`tiến trình con lỗi (mã ${code})`))
                else resolve(JSON.parse(line.slice(6)) as Result)
            })
    })
}

function report(res: Result, secs: number) {
    const done = res.rounds.length
    const avg = res.rounds.reduce((a, b) => a + b,
        0) / (done || 1)
    const sorted = [...res.rounds].sort((a, b) => a - b)
    const finished = Math.max(1,
        N - res.errors - res.reasons.timeout)
    console.log(`\n=== ${N} trận thẻ bài, đội ${size} tướng, pool ${pool.length} tướng, ${secs.toFixed(1)}s, bot ${H2H ? `${H2H[0]} vs ${H2H[1]}` : BOT}${DRAFT ? ", đội do bot cấm/chọn" : ""} ===`)
    console.log(`Thời gian: TB ${(res.ms / Math.max(1,
        N) / 1000).toFixed(2)}s/trận/tiến trình; kế hoạch ${res.plans} (TB ${(res.applies / Math.max(1,
        res.plans)).toFixed(0)} applyAction), dùng lại kế hoạch ${res.hits} lần`)
    if (H2H) console.log(`Đối đầu: ${H2H[0]} thắng ${((res.h2hWins / Math.max(1,
        res.h2hGames)) * 100).toFixed(1)}% trước ${H2H[1]} (${res.h2hGames} trận, đổi bên mỗi trận)`)
    console.log(`Kết thúc: 7 mạng ${res.reasons.lives}, cạn bài ${res.reasons.deck} (${((res.reasons.deck / finished) * 100).toFixed(1)}%), quá giới hạn ${res.reasons.timeout}, lỗi ${res.errors}`)
    console.log(`Số vòng: TB ${avg.toFixed(1)}, min ${sorted[0]}, trung vị ${sorted[Math.floor(done / 2)]}, max ${sorted[done - 1]}`)
    console.log(`Bên đi trước (A) thắng: ${((res.winsA / finished) * 100).toFixed(1)}%`)
    const v = res.v2
    const turns = Math.max(1,
        v.turns ?? 0)
    console.log(`V2: tướng trên sân lúc kết thúc TB ${((v.boardSum ?? 0) / Math.max(1,
        v.boardN ?? 0)).toFixed(2)}/bên (mục tiêu ~4); đòn tính giới hạn ${((v.counted ?? 0) / turns).toFixed(2)}/lượt (tối đa ${cg.RULES.attackLimit}); đòn không cần lá ${((v.cardless ?? 0) / finished).toFixed(1)}/trận`)
    console.log(`V2: lá bị đốt do tay đầy ${((v.burned ?? 0) / finished).toFixed(1)}/trận; mana bỏ phí khi đầy ${(((v.manaWasted ?? 0) / Math.max(1,
        v.manaRegenMax ?? 0)) * 100).toFixed(1)}% lượng hồi; thua do cạn bài ${((res.reasons.deck / finished) * 100).toFixed(1)}%`)
    console.log("Tỉ lệ thắng theo tướng (mỗi lần xuất hiện trong đội):")
    for (const [id,
        s] of Object.entries(res.byHero).sort((a, b) => b[1].wins / b[1].games - a[1].wins / a[1].games))
        console.log(`  ${id.padEnd(14)} ${((s.wins / s.games) * 100).toFixed(1).padStart(5)}%  (${s.games} lần, chết TB ${(s.deaths / s.games).toFixed(1)})`)
    if (PAIRS) {
        const show = (prefix: string, title: string) => {
            const rows = Object.entries(res.pairs).filter(([k]) => k.startsWith(prefix)).sort((a, b) => b[1].wins / b[1].games - a[1].wins / a[1].games)
            const tot = rows.reduce((a, [, v]) => ({
                games: a.games + v.games, wins: a.wins + v.wins
            }),
            {
                games: 0, wins: 0
            })
            console.log(`${title} (gộp: ${((tot.wins / Math.max(1,
                tot.games)) * 100).toFixed(1)}% trên ${tot.games} lần):`)
            for (const [k,
                v] of rows) console.log(`  ${k.slice(prefix.length).padEnd(26)} ${((v.wins / v.games) * 100).toFixed(1).padStart(5)}%  (${v.games})`)
        }
        show("combo:",
            "Cặp combo cùng đội: tỉ lệ thắng của đội có cả hai")
        show("counter:",
            "Khắc chế (X>Y: X ở đội này, Y ở đội kia): tỉ lệ thắng của đội có X")
    }
    if (res.errors || res.reasons.timeout) process.exitCode = 1
}

const t0 = Date.now()
if (RANGE) {
    const res = runRange(RANGE[0],
        RANGE[1])
    if (JSON_OUT) console.log(`@@JSON${JSON.stringify(res)}`)
    else report(res,
        (Date.now() - t0) / 1000)
} else if (JOBS > 1) {
    const chunk = Math.ceil(N / JOBS)
    const parts: Promise<Result>[] = []
    for (let a = 0; a < N; a += chunk) parts.push(runChild(a,
        Math.min(N,
            a + chunk)))
    report(merge(await Promise.all(parts)),
        (Date.now() - t0) / 1000)
} else report(runRange(0,
    N),
(Date.now() - t0) / 1000)
