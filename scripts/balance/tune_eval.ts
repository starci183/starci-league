// Bot tự học trọng số chấm điểm (botEval.EVAL) bằng tự đấu: mỗi vòng sinh 1 bản đột biến của bộ trọng số tốt nhất,
// cho đấu h2h với bản tốt nhất (cặp đổi bên, đổi lượt đi). Thắng ≥ ngưỡng thì thay thế. Ghi nhật ký từng vòng.
// Chạy: npx tsx scripts/balance/tune_eval.ts --iters=30 --games=240 --jobs=24 --out=<thư mục> [--start=<weights.json>]
import {
    execFileSync
} from "node:child_process"
import {
    appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync
} from "node:fs"
import {
    join
} from "node:path"
import {
    fileURLToPath
} from "node:url"
import {
    cg
} from "@starci/shared"

const args = process.argv.slice(2)
const flag = (name: string, d?: string) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? d
const ITERS = Number(flag("iters",
    "30")), GAMES = Number(flag("games",
    "240")), JOBS = Number(flag("jobs",
    "24"))
const ACCEPT = Number(flag("accept",
    "0.55"))
const OUT = flag("out")!
mkdirSync(OUT,
    {
        recursive: true
    })
const runner = join(fileURLToPath(new URL(".",
    import.meta.url)),
"run_batch.ts")

type Weights = Record<string, number>
const flat = (o: Record<string, unknown>, pre = "", out: Weights = {
}): Weights => {
    for (const [k,
        v] of Object.entries(o)) {
        if (typeof v === "number") out[pre + k] = v
        else if (v && typeof v === "object") flat(v as Record<string, unknown>,
            `${pre}${k}.`,
            out)
    }
    return out
}
const start = flag("start")
let best: Weights = {
    ...flat(cg.EVAL as unknown as Record<string, unknown>), ...(start ? JSON.parse(readFileSync(start,
        "utf8")) as Weights : {
    })
}
const keys = Object.keys(best).filter((k) => k !== "win" && best[k] !== 0)

let seed = 1000 + Math.floor(Math.random() * 1e6)
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return seed / 2 ** 31 }
const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd())

function mutate(w: Weights): Weights {
    const c = {
        ...w
    }
    const n = 3 + Math.floor(rnd() * 5)
    for (let k = 0; k < n; k++) {
        const key = keys[Math.floor(rnd() * keys.length)]
        c[key] = +(c[key] * Math.exp(0.35 * gauss())).toPrecision(4)
    }
    return c
}

function h2h(cand: Weights, iter: number): number {
    const dir = join(OUT,
        `iter-${iter}`)
    mkdirSync(dir,
        {
            recursive: true
        })
    writeFileSync(join(dir,
        "cand.json"),
    JSON.stringify(cand))
    writeFileSync(join(dir,
        "best.json"),
    JSON.stringify(best))
    execFileSync(process.execPath,
        [...process.execArgv,
            runner,
            `--n=${GAMES}`,
            `--jobs=${JOBS}`,
            `--seed=${90000 + iter * 7919}`,
            "--h2h=hard:hard",
            `--w1=${join(dir,
                "cand.json")}`,
            `--w2=${join(dir,
                "best.json")}`,
            `--out=${dir}`],
        {
            stdio: "ignore"
        })
    let w = 0, n = 0
    for (const f of readdirSync(dir).filter((x) => x.startsWith("part-"))) {
        for (const line of readFileSync(join(dir,
            f),
        "utf8").split("\n")) {
            if (!line.trim()) continue
            const r = JSON.parse(line) as { i: number; winner: string | null }
            if (!r.winner) continue
            n++
            if ((r.winner === "A") === (r.i % 4 < 2)) w++
        }
    }
    return n ? w / n : 0
}

const log = join(OUT,
    "log.ndjson")
if (!existsSync(join(OUT,
    "best.json"))) writeFileSync(join(OUT,
    "best.json"),
JSON.stringify(best,
    null,
    1))
for (let it = 1; it <= ITERS; it++) {
    const cand = mutate(best)
    const changed = Object.fromEntries(Object.keys(cand).filter((k) => cand[k] !== best[k]).map((k) => [k,
        [best[k],
            cand[k]]]))
    const wr = h2h(cand,
        it)
    const accepted = wr >= ACCEPT
    if (accepted) {
        best = cand
        writeFileSync(join(OUT,
            "best.json"),
        JSON.stringify(best,
            null,
            1))
    }
    appendFileSync(log,
        JSON.stringify({
            it, wr, accepted, changed
        }) + "\n")
    console.log(`vòng ${it}: bản đột biến thắng ${(wr * 100).toFixed(1)}%${accepted ? " → NHẬN" : ""} ${JSON.stringify(changed)}`)
}
