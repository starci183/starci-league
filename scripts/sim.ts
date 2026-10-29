// Mô phỏng hàng loạt: N trận bot (Khó) đánh bot (Khó), đội hình ngẫu nhiên, qua server thật (phòng sim).
// Thống kê tỉ lệ thắng, sát thương, hạ gục theo tướng và vai trò; số vòng kết thúc trận.
// Chạy server trước (npm run dev), rồi: npx tsx scripts/sim.ts [số trận=40] [song song=4] [file json]
import {
    Client
} from "colyseus.js"
import {
    writeFileSync
} from "node:fs"
import {
    CARDS, HeroCard, type RoomState
} from "@starci/shared"

const URL = process.env.SERVER ?? "ws://localhost:2567"
const N = Number(process.argv[2] ?? 40), PAR = Number(process.argv[3] ?? 4), OUT = process.argv[4]
const ROUND_CAP = 80, TIMEOUT_MS = 180_000

type U = { side: string; defId: string; items: string[]; dmg: number; taken: number; kills: number; deaths: number; structure: number; assists: number; support: number; cc: number };
type Result = { winner: string; round: number; units: U[]; towers: Record<string, { towers: number[]; nexus: number }> } | { timeout: true; round: number };

async function one(): Promise<Result> {
    const client = new Client(URL)
    const room = await client.create<RoomState>("duel",
        {
            sim: true, fast: true, name: "sim"
        })
    return new Promise((resolve) => {
        const done = (r: Result) => { clearTimeout(t); clearInterval(iv); room.leave().catch(() => {}); resolve(r) }
        const t = setTimeout(() => done({
            timeout: true, round: room.state.round ?? 0
        }),
        TIMEOUT_MS)
        room.onMessage("simStats",
            (m) => done(m))
        room.onMessage("*",
            () => {})
        const iv = setInterval(() => { if ((room.state.round ?? 0) > ROUND_CAP) done({
            timeout: true, round: room.state.round
        }) },
        500)
    })
}

const results: Result[] = []
let started = 0
async function worker() {
    while (started < N) {
        started++
        try { results.push(await one()) } catch (e) { console.error("lỗi trận:",
            (e as Error).message) }
        process.stdout.write(`\r${results.length}/${N} trận`)
    }
}
await Promise.all(Array.from({
    length: PAR
},
worker))
console.log()

const ended = results.filter((r): r is Exclude<Result, { timeout: true }> => !("timeout" in r))
const rounds = ended.map((r) => r.round).sort((a, b) => a - b)
const q = (p: number) => rounds[Math.min(rounds.length - 1,
    Math.floor(p * rounds.length))]
console.log(`Kết thúc: ${ended.length}/${results.length} (quá ${ROUND_CAP} vòng hoặc quá giờ: ${results.length - ended.length})`)
if (rounds.length) console.log(`Vòng kết thúc: trung vị ${q(0.5)} · 25% ${q(0.25)} · 75% ${q(0.75)} · min ${rounds[0]} · max ${rounds.at(-1)}`)
console.log(`Xanh (A) thắng: ${ended.filter((r) => r.winner === "A").length}/${ended.length}`)

const by = new Map<string, { games: number; wins: number; dmg: number; kills: number; deaths: number; structure: number }>()
const roleBy = new Map<string, { games: number; wins: number; dmg: number; kills: number }>()
for (const r of ended) for (const u of r.units) {
    const h = CARDS[u.defId] as HeroCard
    const a = by.get(u.defId) ?? {
        games: 0, wins: 0, dmg: 0, kills: 0, deaths: 0, structure: 0
    }
    a.games++; if (u.side === r.winner) a.wins++; a.dmg += u.dmg; a.kills += u.kills; a.deaths += u.deaths; a.structure += u.structure
    by.set(u.defId,
        a)
    const b = roleBy.get(h.role) ?? {
        games: 0, wins: 0, dmg: 0, kills: 0
    }
    b.games++; if (u.side === r.winner) b.wins++; b.dmg += u.dmg; b.kills += u.kills
    roleBy.set(h.role,
        b)
}
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "-")
console.table([...by.entries()].sort((x, y) => y[1].wins / y[1].games - x[1].wins / x[1].games).map(([id,
    a]) => ({
    Tướng: id, Vai: (CARDS[id] as HeroCard).role, Trận: a.games, "Tỉ lệ thắng": pct(a.wins,
        a.games),
    "ST/trận": Math.round(a.dmg / a.games), "Hạ gục/trận": (a.kills / a.games).toFixed(2), "Chết/trận": (a.deaths / a.games).toFixed(2), "ST công trình/trận": Math.round(a.structure / a.games),
})))
console.table([...roleBy.entries()].map(([role,
    a]) => ({
    Vai: role, Lượt: a.games, "Tỉ lệ thắng": pct(a.wins,
        a.games), "ST/trận": Math.round(a.dmg / a.games), "Hạ gục/trận": (a.kills / a.games).toFixed(2)
})))
// ===== MVP (kiểu Liên Quân): điểm mỗi tướng trong trận, tính theo phần đóng góp trong đội =====
// điểm = 2×hạ gục + 1.2×hỗ trợ − 1×chết + 6×%sát thương tướng + 3×%sát thương gánh chịu + 4×%hồi/khiên + 3×%sát thương công trình + 3×%khống chế
const mvpBy = new Map<string, { n: number; score: number; mvp: number; mvpLose: number }>()
const share = (team: U[], k: keyof U, u: U) => { const t = team.reduce((s, x) => s + (x[k] as number),
    0); return t ? (u[k] as number) / t : 0 }
for (const r of ended) {
    const scored = r.units.map((u) => {
        const team = r.units.filter((x) => x.side === u.side)
        const score = 2 * u.kills + 1.2 * u.assists - u.deaths + 6 * share(team,
            "dmg",
            u) + 3 * share(team,
            "taken",
            u)
      + 4 * share(team,
          "support",
          u) + 3 * share(team,
            "structure",
            u) + 3 * share(team,
            "cc",
            u)
        return {
            u, score
        }
    })
    const top = (side: string) => scored.filter((x) => x.u.side === side).sort((a, b) => b.score - a.score)[0]
    const win = top(r.winner), lose = top(r.winner === "A" ? "B" : "A")
    for (const { u, score } of scored) {
        const a = mvpBy.get(u.defId) ?? {
            n: 0, score: 0, mvp: 0, mvpLose: 0
        }
        a.n++; a.score += score
        if (win && win.u === u) a.mvp++
        if (lose && lose.u === u) a.mvpLose++
        mvpBy.set(u.defId,
            a)
    }
}
console.log("MVP: điểm trung bình, % trận là MVP phe thắng, % trận là MVP phe thua")
console.table([...mvpBy.entries()].sort((x, y) => y[1].score / y[1].n - x[1].score / x[1].n).map(([id,
    a]) => ({
    Tướng: id, Vai: (CARDS[id] as HeroCard).role, "Điểm TB": (a.score / a.n).toFixed(1), "MVP thắng": pct(a.mvp,
        a.n), "MVP thua": pct(a.mvpLose,
        a.n),
})))

// cặp tướng cùng đội: tỉ lệ thắng (đội hình hợp / kỵ nhau)
const pairBy = new Map<string, { n: number; wins: number }>()
for (const r of ended) for (const side of ["A",
    "B"]) {
    const ids = r.units.filter((u) => u.side === side).map((u) => u.defId).sort()
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
        const k = `${ids[i]} + ${ids[j]}`, a = pairBy.get(k) ?? {
            n: 0, wins: 0
        }
        a.n++; if (side === r.winner) a.wins++; pairBy.set(k,
            a)
    }
}
const pairs = [...pairBy.entries()].filter(([, a]) => a.n >= 6).sort((x, y) => y[1].wins / y[1].n - x[1].wins / x[1].n)
const pairRow = ([k,
    a]: [string, { n: number; wins: number }]) => ({
    "Cặp": k, Trận: a.n, "Tỉ lệ thắng": pct(a.wins,
        a.n)
})
console.log("Cặp hợp nhất"); console.table(pairs.slice(0,
    8).map(pairRow))
console.log("Cặp kỵ nhất"); console.table(pairs.slice(-8).map(pairRow))

// đồ: tỉ lệ thắng của tướng đang đeo món đó lúc hết trận
const itemBy = new Map<string, { n: number; wins: number }>()
for (const r of ended) for (const u of r.units) for (const id of new Set(u.items)) {
    const a = itemBy.get(id) ?? {
        n: 0, wins: 0
    }
    a.n++; if (u.side === r.winner) a.wins++
    itemBy.set(id,
        a)
}
console.table([...itemBy.entries()].filter(([, a]) => a.n >= 8).sort((x, y) => y[1].wins / y[1].n - x[1].wins / x[1].n)
    .map(([id,
        a]) => ({
        Đồ: id, "Lượt đeo": a.n, "Tỉ lệ thắng": pct(a.wins,
            a.n)
    })))
if (OUT) writeFileSync(OUT,
    JSON.stringify(results,
        null,
        1))
process.exit(0)
