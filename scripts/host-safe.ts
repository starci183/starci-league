import {
    spawn,
    spawnSync,
    type ChildProcess
} from "node:child_process"
import {
    existsSync,
    mkdirSync,
    readdirSync,
    statSync,
    watch,
    writeFileSync
} from "node:fs"
import {
    join,
    resolve
} from "node:path"

const ROOT = resolve(import.meta.dirname,
    "..")
const SERVER_DIR = join(ROOT,
    "packages",
    "server")
const CLIENT_DIR = join(ROOT,
    "packages",
    "client")
const SERVER_PORT = Number(process.env.PORT ?? 2567)
const PREVIEW_PORT = 4173
const DEBOUNCE_MS = 45_000
const POLL_MS = 10_000
const WATCH_DIRS = [
    join(ROOT,
        "packages",
        "shared",
        "src"),
    join(ROOT,
        "packages",
        "server",
        "src"),
    join(ROOT,
        "packages",
        "client",
        "src"),
    join(ROOT,
        "packages",
        "client",
        "public"),
]

function log(tag: string, text: string): void {
    for (const line of text.split(/\r?\n/)) {
        if (line.trim().length > 0) console.log(`[${tag}] ${line}`)
    }
}

function clock(): string {
    const now = new Date()
    return `${String(now.getHours()).padStart(2,
        "0")}:${String(now.getMinutes()).padStart(2,
        "0")}`
}

function sleep(ms: number): Promise<void> {
    return new Promise((done) => setTimeout(done,
        ms))
}

function start(tag: string, cwd: string, args: string[]): ChildProcess {
    // shell: true để npx.cmd chạy được trên Windows
    const child = spawn("npx",
        args,
        {
            cwd,
            shell: true,
            stdio: ["ignore",
                "pipe",
                "pipe"]
        })
    child.stdout?.on("data",
        (data: Buffer) => log(tag,
            data.toString()))
    child.stderr?.on("data",
        (data: Buffer) => log(tag,
            data.toString()))
    child.on("exit",
        (code) => log(tag,
            `đã thoát (mã ${code})`))
    return child
}

function kill(child: ChildProcess | null): Promise<void> {
    return new Promise((done) => {
        if (!child || child.pid === undefined || child.exitCode !== null) {
            done()
            return
        }
        child.once("exit",
            () => done())
        if (process.platform === "win32") {
            spawnSync("taskkill",
                ["/pid",
                    String(child.pid),
                    "/t",
                    "/f"])
        } else {
            child.kill("SIGTERM")
        }
        setTimeout(done,
            5000)
    })
}

function run(tag: string, cwd: string, command: string): boolean {
    const res = spawnSync(command,
        {
            cwd,
            shell: true,
            encoding: "utf8"
        })
    log(tag,
        `${res.stdout ?? ""}${res.stderr ?? ""}`)
    return res.status === 0
}

async function activeHumanMatches(): Promise<number | null> {
    try {
        const res = await fetch(`http://127.0.0.1:${SERVER_PORT}/__host/rooms`)
        const body = await res.json() as {
            active?: number
        }
        return typeof body.active === "number" ? body.active : null
    } catch {
        return null
    }
}

function gitHash(): string {
    const res = spawnSync("git rev-parse --short HEAD",
        {
            cwd: ROOT,
            shell: true,
            encoding: "utf8"
        })
    return res.status === 0 ? res.stdout.trim() : "unknown"
}

function writeVersion(): void {
    const dist = join(CLIENT_DIR,
        "dist")
    if (!existsSync(dist)) {
        mkdirSync(dist,
            {
                recursive: true
            })
    }
    writeFileSync(join(dist,
        "version.json"),
    JSON.stringify({
        updatedAt: new Date().toISOString(),
        time: clock(),
        commit: gitHash()
    }))
}

let serverChild: ChildProcess | null = null
let previewChild: ChildProcess | null = null
let pending = false
let lastChange = 0
let updating = false
let stopping = false

function startServer(): void {
    serverChild = start("server",
        SERVER_DIR,
        ["tsx",
            "--env-file=.env",
            "src/index.ts"])
}

function startPreview(): void {
    previewChild = start("client",
        CLIENT_DIR,
        ["vite",
            "preview",
            "--port",
            String(PREVIEW_PORT),
            "--strictPort"])
}

function onChange(path: string | null): void {
    if (!pending && !updating) log("host",
        `Phát hiện thay đổi${path ? ` (${path})` : ""}, chờ ${DEBOUNCE_MS / 1000}s yên lặng`)
    pending = true
    lastChange = Date.now()
}

function watchTree(dir: string): void {
    try {
        watch(dir,
            {
                recursive: true
            },
            (_event, file) => onChange(file ? String(file) : null))
    } catch {
        // nền tảng không hỗ trợ recursive: theo dõi từng thư mục con
        watch(dir,
            (_event, file) => onChange(file ? String(file) : null))
        for (const name of readdirSync(dir)) {
            const sub = join(dir,
                name)
            if (statSync(sub).isDirectory()) watchTree(sub)
        }
    }
}

async function applyUpdate(): Promise<void> {
    updating = true
    const startedAt = lastChange
    try {
        log("host",
            "Chạy typecheck...")
        if (!run("typecheck",
            ROOT,
            "npm run typecheck")) {
            log("host",
                "Typecheck LỖI, giữ bản cũ đang chạy. Sẽ thử lại khi có thay đổi tiếp theo.")
            if (lastChange === startedAt) pending = false
            return
        }
        log("host",
            "Typecheck xanh, chờ không còn trận nào có người chơi...")
        for (;;) {
            const active = await activeHumanMatches()
            if (active === 0) break
            log("host",
                active === null ? "Chưa hỏi được server, thử lại sau" : `Còn ${active} trận đang chơi, chờ ${POLL_MS / 1000}s`)
            await sleep(POLL_MS)
            if (stopping) return
        }
        log("host",
            "Build client...")
        if (!run("build",
            CLIENT_DIR,
            "npx vite build")) {
            log("host",
                "Build LỖI, giữ bản cũ. Sẽ thử lại khi có thay đổi tiếp theo.")
            if (lastChange === startedAt) pending = false
            return
        }
        // trong lúc build có thể đã có trận mới: kiểm tra lại ngay trước khi tắt server
        while ((await activeHumanMatches()) !== 0) {
            log("host",
                "Có trận mới bắt đầu, chờ thêm trước khi khởi động lại server")
            await sleep(POLL_MS)
            if (stopping) return
        }
        await kill(serverChild)
        startServer()
        writeVersion()
        log("host",
            `Đã cập nhật bản mới lúc ${clock()}`)
        if (lastChange === startedAt) pending = false
    } finally {
        updating = false
    }
}

async function shutdown(): Promise<void> {
    if (stopping) return
    stopping = true
    log("host",
        "Đang tắt server và client...")
    await Promise.all([kill(serverChild),
        kill(previewChild)])
    process.exit(0)
}

async function main(): Promise<void> {
    process.on("SIGINT",
        () => void shutdown())
    process.on("SIGTERM",
        () => void shutdown())
    if (!existsSync(join(CLIENT_DIR,
        "dist",
        "index.html"))) {
        log("host",
            "Chưa có dist, build lần đầu...")
        run("build",
            CLIENT_DIR,
            "npx vite build")
    }
    writeVersion()
    startServer()
    startPreview()
    for (const dir of WATCH_DIRS) {
        if (existsSync(dir)) watchTree(dir)
    }
    log("host",
        `Server ws://localhost:${SERVER_PORT}, client http://localhost:${PREVIEW_PORT}. Đang theo dõi thay đổi.`)
    while (!stopping) {
        await sleep(1000)
        if (pending && !updating && Date.now() - lastChange >= DEBOUNCE_MS) await applyUpdate()
    }
}

void main()
