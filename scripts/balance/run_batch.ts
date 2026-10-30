// Chạy đợt cân bằng: N trận bot-vs-bot theo cặp đổi bên (trận 2k và 2k+1 dùng cùng 2 đội, cùng seed, đổi phe).
// Mỗi trận ghi 1 dòng NDJSON: đội, người thắng, lý do kết thúc, số vòng và chỉ số từng tướng.
// Chạy: npx tsx scripts/balance/run_batch.ts --n=5000 --jobs=24 --seed=20261031 --out=<thư mục> [--bot=hard]
import {
    spawn
} from "node:child_process"
import {
    appendFileSync, mkdirSync, readFileSync, writeFileSync
} from "node:fs"
import {
    join
} from "node:path"
import {
    fileURLToPath, pathToFileURL
} from "node:url"
import {
    cg
} from "@starci/shared"

const args = process.argv.slice(2)
const flag = (name: string, d?: string) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? d
const N = Number(flag("n",
    "5000")), JOBS = Number(flag("jobs",
    "24")), SEED0 = Number(flag("seed",
    "20261031"))
const OUT = flag("out")!
const BOT = (flag("bot",
    "hard")) as cg.BotLevel
/** --h2h=expert:hard: so 2 mức bot. Trận i%4<2 mức đầu cầm phe A, còn lại cầm phe B: mỗi mức chơi cả hai đội hình và cả hai lượt đi */
const H2H = flag("h2h")?.split(":") as [cg.BotLevel, cg.BotLevel] | undefined
/** --w1=<json>, --w2=<json>: trọng số chấm điểm (botEval.EVAL, khoá dạng "a.b" → số) cho mức đầu/mức sau của h2h; không truyền = mặc định */
const W_FILES = [flag("w1"),
    flag("w2")]
/** --m1=<json>, --m2=<json>: mô hình giá trị học được (botEval.VALUE_MODEL.w) cho mức đầu/mức sau; --m=<json> cho mọi bên khi không h2h */
const M_FILES = [flag("m1") ?? flag("m"),
    flag("m2") ?? flag("m")]
const SLOT_MODELS = M_FILES.map((f) => (f ? JSON.parse(readFileSync(f,
    "utf8")) as Partial<Record<cg.TermKey, number>> : null))
/** --dump: ghi hiệu thành phần chấm điểm mỗi đầu lượt (nhìn từ phe A) + kết cục, để học VALUE_MODEL */
const DUMP = args.includes("--dump")
const RANGE = flag("range")?.split(":").map(Number)
// --set=khoá=giá trị (lặp được, khoá lồng bằng dấu chấm, mảng viết 1/4/8): thử thay luật chung cg.RULES (vd --set=teamManaMax=500)
const SETS = args.filter((a) => a.startsWith("--set="))
for (const a of SETS) {
    const [path,
        raw] = a.slice(6).split("=")
    const keys = path.split(".")
    let o = cg.RULES as unknown as Record<string, unknown>
    for (const k of keys.slice(0,
        -1)) o = o[k] as Record<string, unknown>
    o[keys[keys.length - 1]] = raw.includes("/") ? raw.split("/").map(Number) : Number(raw)
}

type Weights = Record<string, number>
const flatEval = (o: Record<string, unknown>, pre = "", out: Weights = {
}): Weights => {
    for (const [k,
        v] of Object.entries(o)) {
        if (typeof v === "number") out[pre + k] = v
        else if (v && typeof v === "object") flatEval(v as Record<string, unknown>,
            `${pre}${k}.`,
            out)
    }
    return out
}
export const DEFAULT_WEIGHTS = flatEval(cg.EVAL as unknown as Record<string, unknown>)
const SLOT_WEIGHTS: Weights[] = W_FILES.map((f) => ({
    ...DEFAULT_WEIGHTS, ...(f ? JSON.parse(readFileSync(f,
        "utf8")) as Weights : {
    })
}))
let activeSlot = -1
function useWeights(slot: number) {
    if (slot === activeSlot) return
    activeSlot = slot
    cg.VALUE_MODEL.w = SLOT_MODELS[slot]
    for (const [path,
        v] of Object.entries(SLOT_WEIGHTS[slot])) {
        const keys = path.split(".")
        let o = cg.EVAL as unknown as Record<string, unknown>
        for (const k of keys.slice(0,
            -1)) o = o[k] as Record<string, unknown>
        o[keys[keys.length - 1]] = v
    }
}
const ROUND_CAP = 300, STEP_CAP = 30000

type HeroStat = { hp: number; enemyHp: number; friendlyHp: number; heal: number; shield: number; casts: number; attacks: number; kills: number; deaths: number; saves: number; boardTurns: number; peakStacks: Record<string, number> }
const zero = (): HeroStat => ({
    hp: 0, enemyHp: 0, friendlyHp: 0, heal: 0, shield: 0, casts: 0, attacks: 0, kills: 0, deaths: 0, saves: 0, boardTurns: 0, peakStacks: {
    }
})

function rng(seed: number) {
    let x = seed >>> 0
    return () => {
        x = (x + 0x6d2b79f5) >>> 0
        let t = x
        t = Math.imul(t ^ (t >>> 15),
            t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7),
            t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

/** Hai đội 5 tướng rời nhau, ngẫu nhiên theo cặp */
function teams(ids: string[], pair: number): [string[], string[]] {
    const r = rng(SEED0 + pair * 0x9e3779b9)
    const pool = [...ids]
    for (let k = pool.length - 1; k > 0; k--) {
        const j = Math.floor(r() * (k + 1));
        [pool[k],
            pool[j]] = [pool[j],
            pool[k]]
    }
    return [pool.slice(0,
        5),
    pool.slice(5,
        10)]
}

/** --draft=<draftModel.ts>: đội do bot cấm/chọn theo mô hình học (2 cấm mỗi bên, chọn rắn A B B A A B B A A B), nhiễu nhỏ theo cặp */
const DRAFT = flag("draft")
const draftModel: cg.DraftModel | undefined = DRAFT ? (await import(pathToFileURL(DRAFT).href)).DRAFT_MODEL : undefined
function draftTeams(ids: string[], pair: number) {
    const r = rng(SEED0 * 7 + pair * 0x85ebca6b)
    const avail = [...ids], bans: string[] = [], picks: Record<"L" | "R", string[]> = {
        L: [], R: []
    }
    const take = (h: string) => avail.splice(avail.indexOf(h),
        1)
    for (const who of ["L", "R", "L", "R"] as const) {
        const me = picks[who], them = picks[who === "L" ? "R" : "L"]
        const h = cg.draftChoice({
            available: avail, mine: me, theirs: them, action: "ban", model: draftModel, noise: 0.08, rnd: r
        })!
        bans.push(h)
        take(h)
    }
    const order = ["L", "R", "R", "L", "L", "R", "R", "L", "L", "R"] as const
    order.forEach((who, k) => {
        const me = picks[who], them = picks[who === "L" ? "R" : "L"]
        const left = order.slice(k + 1).filter((x) => x !== who).length
        const h = cg.draftChoice({
            available: avail, mine: me, theirs: them, action: "pick", model: draftModel, theirPicksLeft: left, noise: 0.08, rnd: r
        })!
        me.push(h)
        take(h)
    })
    return {
        left: picks.L, right: picks.R, bans
    }
}

function playOne(ids: string[], i: number) {
    const pair = Math.floor(i / 2)
    const drafted = DRAFT ? draftTeams(ids,
        pair) : undefined
    const [left,
        right] = drafted ? [drafted.left,
        drafted.right] : teams(ids,
        pair)
    const [A,
        B] = i % 2 ? [right,
        left] : [left,
        right]
    const seed = (SEED0 + pair * 65537) >>> 0
    const t0 = performance.now()
    let state = cg.newGame(seed,
        A,
        B)
    const stats: Record<string, HeroStat> = {
    }
    for (const side of ["A", "B"] as const) for (const id of state.players[side].heroes) stats[`${side}:${id}`] = zero()
    let steps = 0
    let error: string | undefined
    const dump: { r: number; a: string; d: number[] }[] = []
    if (!H2H) useWeights(0)
    try {
        while (state.phase !== "over" && steps < STEP_CAP && state.round <= ROUND_CAP) {
            steps++
            const side = cg.whoseMove(state)
            const slot = (i % 4 < 2) === (side === "A") ? 0 : 1
            if (H2H) useWeights(slot)
            const res = cg.applyAction(state,
                cg.chooseAction(state,
                    side,
                    H2H ? H2H[slot] : BOT))
            for (const e of res.events) {
                if (DUMP && e.t === "turnStart" && res.state.phase !== "over") {
                    const d = cg.evalTermDiff(res.state,
                        "A")
                    dump.push({
                        r: res.state.round, a: res.state.active, d: cg.TERM_KEYS.map((k) => Math.round(d[k] * 10) / 10)
                    })
                }
                if (e.t === "turnStart") for (const [id, s] of Object.entries(stats)) if (id.startsWith(e.side + ":") && res.state.units[id]?.status === "board") s.boardTurns++
                if (e.t === "damage" && e.src && stats[e.src]) {
                    const s = stats[e.src]
                    s.hp += e.hpLost
                    const src = res.state.units[e.src], tgt = res.state.units[e.target]
                    if (src && tgt) { if (src.side !== tgt.side) s.enemyHp += e.hpLost + e.absorbed; else s.friendlyHp += e.hpLost }
                }
                if (e.t === "heal" && e.src && stats[e.src]) stats[e.src].heal += e.amount
                if (e.t === "shield" && e.src && stats[e.src]) stats[e.src].shield += e.amount
                if (e.t === "cast" && stats[e.unit]) stats[e.unit].casts++
                if (e.t === "attack" && "attacker" in e && stats[e.attacker]) stats[e.attacker].attacks++
                if (e.t === "kill") {
                    if (e.src && stats[e.src] && res.state.units[e.src]?.side !== res.state.units[e.target]?.side) stats[e.src].kills++
                    if (stats[e.target]) stats[e.target].deaths++
                }
                if (e.t === "stack" && stats[e.unit]) {
                    const s = stats[e.unit]
                    s.peakStacks[e.key] = Math.max(s.peakStacks[e.key] ?? 0,
                        e.value)
                }
            }
            state = res.state
        }
    } catch (err) {
        error = String((err as Error)?.stack ?? err).slice(0,
            600)
    }
    return {
        i, pair, seed, A, B, bans: drafted?.bans, winner: state.winner ?? null, reason: error ? "error" : state.phase === "over" ? state.endReason : "timeout",
        round: state.round, steps, ms: Math.round(performance.now() - t0), error, stats, ...(DUMP ? {
            dump
        } : {
        })
    }
}

const ids = cg.implementedHeroes().map((h) => h.id).filter((id) => !id.startsWith("rx_")).sort()

if (RANGE) {
    const file = join(OUT,
        `part-${RANGE[0]}.ndjson`)
    writeFileSync(file,
        "")
    for (let i = RANGE[0]; i < RANGE[1]; i++) appendFileSync(file,
        JSON.stringify(playOne(ids,
            i)) + "\n")
} else {
    mkdirSync(OUT,
        {
            recursive: true
        })
    writeFileSync(join(OUT,
        "manifest.json"),
    JSON.stringify({
        n: N, jobs: JOBS, seed: SEED0, bot: BOT, h2h: H2H, weights: W_FILES, draft: DRAFT, sets: SETS, roundCap: ROUND_CAP, stepCap: STEP_CAP, heroes: ids, rules: cg.RULES,
        createdAt: new Date().toISOString()
    },
    null,
    2))
    const self = fileURLToPath(import.meta.url)
    // chia theo cặp để mỗi cặp đổi bên nằm cùng một tiến trình
    const pairs = Math.ceil(N / 2), per = Math.ceil(pairs / JOBS)
    const t0 = Date.now()
    let done = 0
    await Promise.all(Array.from({
        length: JOBS
    },
    (_, j) => {
        const a = Math.min(N,
            j * per * 2), b = Math.min(N,
            (j + 1) * per * 2)
        if (a >= b) return Promise.resolve()
        return new Promise<void>((resolve, reject) => {
            const p = spawn(process.execPath,
                [...process.execArgv,
                    self,
                    `--out=${OUT}`,
                    `--seed=${SEED0}`,
                    `--bot=${BOT}`,
                    ...(H2H ? [`--h2h=${H2H.join(":")}`] : []),
                    ...W_FILES.flatMap((w, k) => (w ? [`--w${k + 1}=${w}`] : [])),
                    ...(DRAFT ? [`--draft=${DRAFT}`] : []),
                    ...SETS,
                    ...M_FILES.flatMap((m, k) => (m ? [`--m${k + 1}=${m}`] : [])),
                    ...(DUMP ? ["--dump"] : []),
                    `--range=${a}:${b}`],
                {
                    stdio: "inherit"
                })
            p.on("exit",
                (code) => { done++; console.log(`worker ${j} xong (${done}/${JOBS}) sau ${Math.round((Date.now() - t0) / 1000)}s`); code ? reject(new Error(`worker ${j} exit ${code}`)) : resolve() })
        })
    }))
    console.log(`Xong ${N} trận trong ${Math.round((Date.now() - t0) / 1000)}s → ${OUT}`)
}
