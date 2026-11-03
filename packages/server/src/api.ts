// API HTTP ngoài trận trên PostgreSQL: đăng ký, đăng nhập, hồ sơ, bộ bài, kho lá. Web lobby và client Cocos cùng gọi.
// Quyền "mỗi người chỉ đọc/ghi dữ liệu của mình" (trước là RLS của Supabase) kiểm ở đây: mọi truy vấn lọc theo owner_id lấy từ token.
import type {
    IncomingMessage, ServerResponse
} from "node:http"
import {
    DECK_POOL, DECK_SIZE, DEFAULT_DECK, validateDeck
} from "@starci/shared/src/cardgame/deck"
import {
    itemText
} from "@starci/shared/src/cardgame/items"
import {
    db
} from "./db"
import {
    hashPassword, issueToken, verifyPassword, verifyToken
} from "./session"

/** Tiền tố mã lá khi lưu bộ chế độ thẻ bài (giống client) */
const CG_PREFIX = "cg:"
const MAX_BODY = 64 * 1024
const ORIGINS = (process.env.CORS_ORIGINS ?? "http://localhost:5180,http://localhost:7456").split(",").map((o) => o.trim())

/** Tên tiếng Việt của lá không phải mảnh Đồ (khớp deckStore của web); tên mảnh Đồ lấy từ itemText */
const CARD_NAMES: Record<string, string> = {
    basic: "Đánh thường",
    draw: "Rút Bài",
    gold: "Vàng",
    "spell:heal": "Hồi Máu",
    "spell:flash": "Tốc Biến",
    "spell:ignite": "Thiêu Đốt",
    "spell:exhaust": "Kiệt Sức",
    "spell:barrier": "Lá Chắn",
    "spell:cleanse": "Thanh Tẩy",
    "spell:smite": "Trừng Phạt",
    "spell:teleport": "Dịch Chuyển",
}
/** Kho lá cho client ngoài web (Cocos): mã, nhóm, số bản tối đa, tên */
/** Mô tả ngắn tiếng Việt (khớp deckStore của web); mảnh Đồ lấy chỉ số từ itemText */
const CARD_DESC: Record<string, string> = {
    basic: "1 tướng mình đánh thường theo luật vai",
    draw: "Rút 2 lá",
    gold: "Dùng ghép đồ: 2 mảnh Đồ + 1 Vàng = 1 món",
    "spell:heal": "1 tướng mình hồi 100 + 10% máu tối đa",
    "spell:flash": "Đổi đường 1 tướng mình với 1 tướng mình khác trên sân",
    "spell:ignite": "1 tướng địch bị Thiêu Đốt 2 lượt: mất máu mỗi lượt, hồi máu giảm một nửa",
    "spell:exhaust": "1 tướng địch gây ít hơn 40% sát thương tới hết lượt sau",
    "spell:barrier": "1 tướng mình nhận Khiên 80 + 10% máu tối đa",
    "spell:cleanse": "Gỡ mọi hiệu ứng khống chế khỏi 1 tướng mình",
    "spell:smite": "Gây sát thương chuẩn lớn lên vật triệu hồi ở ô phụ của địch",
    "spell:teleport": "Gọi ngay 1 tướng dự bị ra sân vào một đường trống",
}
const CARD_POOL = DECK_POOL.map((d) => {
    const item = d.id.startsWith("item:") ? itemText(d.id.slice(5),
        "vi") : undefined
    return {
        ...d,
        name: item?.name ?? CARD_NAMES[d.id] ?? d.id,
        desc: item ? `Mảnh Đồ: ${item.stats ?? ""}`.trim() : CARD_DESC[d.id] ?? "",
    }
})

class HttpError extends Error {
    constructor(readonly status: number, message: string) { super(message) }
}

interface DeckRow { id: string; name: string; cards: string[]; is_active: boolean }

function send(res: ServerResponse, status: number, body: unknown) {
    res.writeHead(status,
        {
            "content-type": "application/json", "cache-control": "no-store"
        })
    res.end(JSON.stringify(body))
}

function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
        let size = 0
        const chunks: Buffer[] = []
        req.on("data",
            (c: Buffer) => {
                size += c.length
                if (size > MAX_BODY) { reject(new HttpError(413,
                    "Dữ liệu gửi lên quá lớn")); req.destroy(); return }
                chunks.push(c)
            })
        req.on("end",
            () => {
                if (!chunks.length) return resolve({
                })
                try {
                    const v = JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown
                    if (v && typeof v === "object" && !Array.isArray(v)) resolve(v as Record<string, unknown>)
                    else reject(new HttpError(400,
                        "Dữ liệu phải là một object JSON"))
                } catch {
                    reject(new HttpError(400,
                        "JSON không hợp lệ"))
                }
            })
        req.on("error",
            reject)
    })
}

function pool() {
    if (!db) throw new HttpError(503,
        "Server chưa kết nối cơ sở dữ liệu")
    return db
}

function userOf(req: IncomingMessage): string {
    const auth = req.headers.authorization ?? ""
    const uid = auth.startsWith("Bearer ") ? verifyToken(auth.slice(7)) : null
    if (!uid) throw new HttpError(401,
        "Phiên đăng nhập không hợp lệ, hãy đăng nhập lại")
    return uid
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "")

function deckName(v: unknown): string {
    const name = str(v)
    if (name.length < 1 || name.length > 32) throw new HttpError(400,
        "Tên bộ bài dài 1 đến 32 ký tự")
    return name
}

/** Bộ chế độ thẻ bài: mảng mã "cg:<lá>", đúng luật bộ gốc */
function deckCards(v: unknown): string[] {
    if (!Array.isArray(v) || !v.every((c) => typeof c === "string" && c.startsWith(CG_PREFIX))) throw new HttpError(400,
        "Bộ bài không hợp lệ")
    const err = validateDeck(v.map((c: string) => c.slice(CG_PREFIX.length)))
    if (err) throw new HttpError(400,
        err)
    return v as string[]
}

async function profile(uid: string) {
    const { rows } = await pool().query<{ id: string; email: string; name: string; rating: number; wins: number; losses: number; created_at: string }>(
        "select u.id, u.email, p.display_name as name, p.rating, p.wins, p.losses, u.created_at from users u join profiles p on p.id = u.id where u.id = $1",
        [uid])
    if (!rows[0]) throw new HttpError(401,
        "Tài khoản không còn tồn tại, hãy đăng nhập lại")
    return rows[0]
}

/** Bảng xếp hạng: 20 người điểm cao nhất, kèm hạng của người hỏi */
async function leaderboard(uid: string) {
    const top = await pool().query<{ id: string; name: string; rating: number; wins: number; losses: number }>(
        "select id, display_name as name, rating, wins, losses from profiles where wins + losses > 0 order by rating desc, wins desc limit 20")
    const mine = await pool().query<{ rank: string }>(
        "select count(*) + 1 as rank from profiles where rating > (select rating from profiles where id = $1)",
        [uid])
    return {
        top: top.rows, rank: Number(mine.rows[0]?.rank ?? 0)
    }
}

async function register(body: Record<string, unknown>) {
    const email = str(body.email).toLowerCase(), password = typeof body.password === "string" ? body.password : ""
    const name = (str(body.displayName) || email.split("@")[0]).slice(0,
        24)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400,
        "Email không hợp lệ")
    if (password.length < 6) throw new HttpError(400,
        "Mật khẩu cần ít nhất 6 ký tự")
    if (!name) throw new HttpError(400,
        "Tên hiển thị không được trống")
    const hash = await hashPassword(password)
    const client = await pool().connect()
    try {
        await client.query("begin")
        const { rows } = await client.query<{ id: string }>("insert into users (email, password_hash) values ($1, $2) returning id",
            [email,
                hash])
        await client.query("insert into profiles (id, display_name) values ($1, $2)",
            [rows[0].id,
                name])
        await client.query("commit")
        return {
            token: issueToken(rows[0].id), user: {
                id: rows[0].id, email, name
            }
        }
    } catch (e) {
        await client.query("rollback")
        if ((e as { code?: string }).code === "23505") throw new HttpError(409,
            "Email này đã có tài khoản")
        throw e
    } finally {
        client.release()
    }
}

async function login(body: Record<string, unknown>) {
    const email = str(body.email).toLowerCase(), password = typeof body.password === "string" ? body.password : ""
    const { rows } = await pool().query<{ id: string; password_hash: string }>("select id, password_hash from users where email = $1",
        [email])
    if (!rows[0] || !await verifyPassword(password,
        rows[0].password_hash)) throw new HttpError(401,
        "Email hoặc mật khẩu không đúng")
    return {
        token: issueToken(rows[0].id), user: await profile(rows[0].id)
    }
}

async function listDecks(uid: string): Promise<DeckRow[]> {
    const { rows } = await pool().query<DeckRow>("select id, name, cards, is_active from decks where owner_id = $1 order by created_at",
        [uid])
    return rows
}

async function createDeck(uid: string, body: Record<string, unknown>): Promise<DeckRow> {
    const { rows } = await pool().query<DeckRow>(
        `insert into decks (owner_id, name, cards, is_active)
         values ($1, $2, $3, not exists (select 1 from decks where owner_id = $1 and is_active))
         returning id, name, cards, is_active`,
        [uid,
            deckName(body.name),
            deckCards(body.cards)])
    return rows[0]
}

async function updateDeck(uid: string, id: string, body: Record<string, unknown>): Promise<DeckRow> {
    const name = body.name === undefined ? null : deckName(body.name)
    const cards = body.cards === undefined ? null : deckCards(body.cards)
    const { rows } = await pool().query<DeckRow>(
        `update decks set name = coalesce($3, name), cards = coalesce($4, cards), updated_at = now()
         where id = $1 and owner_id = $2 returning id, name, cards, is_active`,
        [id,
            uid,
            name,
            cards])
    if (!rows[0]) throw new HttpError(404,
        "Không tìm thấy bộ bài")
    return rows[0]
}

async function activateDeck(uid: string, id: string): Promise<DeckRow> {
    const client = await pool().connect()
    try {
        await client.query("begin")
        await client.query("update decks set is_active = false where owner_id = $1 and is_active and id <> $2",
            [uid,
                id])
        const { rows } = await client.query<DeckRow>("update decks set is_active = true where id = $1 and owner_id = $2 returning id, name, cards, is_active",
            [id,
                uid])
        if (!rows[0]) throw new HttpError(404,
            "Không tìm thấy bộ bài")
        await client.query("commit")
        return rows[0]
    } catch (e) {
        await client.query("rollback")
        throw e
    } finally {
        client.release()
    }
}

async function deleteDeck(uid: string, id: string) {
    const { rowCount } = await pool().query("delete from decks where id = $1 and owner_id = $2",
        [id,
            uid])
    if (!rowCount) throw new HttpError(404,
        "Không tìm thấy bộ bài")
    return {
        ok: true
    }
}

const UUID = "([0-9a-f-]{36})"
const DECK_PATH = new RegExp(`^/api/decks/${UUID}$`)
const ACTIVATE_PATH = new RegExp(`^/api/decks/${UUID}/activate$`)

async function route(req: IncomingMessage, path: string): Promise<[number, unknown]> {
    const m = req.method
    if (m === "GET" && path === "/api/cards") return [200,
        {
            size: DECK_SIZE, pool: CARD_POOL, defaultDeck: DEFAULT_DECK, prefix: CG_PREFIX
        }]
    if (m === "POST" && path === "/api/auth/register") return [201,
        await register(await readJson(req))]
    if (m === "POST" && path === "/api/auth/login") return [200,
        await login(await readJson(req))]
    if (m === "GET" && path === "/api/me") return [200,
        await profile(userOf(req))]
    if (m === "GET" && path === "/api/leaderboard") return [200,
        await leaderboard(userOf(req))]
    if (path === "/api/decks") {
        const uid = userOf(req)
        if (m === "GET") return [200,
            await listDecks(uid)]
        if (m === "POST") return [201,
            await createDeck(uid,
                await readJson(req))]
    }
    const one = DECK_PATH.exec(path)
    if (one) {
        const uid = userOf(req)
        if (m === "PATCH") return [200,
            await updateDeck(uid,
                one[1],
                await readJson(req))]
        if (m === "DELETE") return [200,
            await deleteDeck(uid,
                one[1])]
    }
    const act = ACTIVATE_PATH.exec(path)
    if (act && m === "POST") return [200,
        await activateDeck(userOf(req),
            act[1])]
    throw new HttpError(404,
        "Không có API này")
}

/** Xử lý request /api/*; trả false nếu không phải đường dẫn API */
export function handleApi(req: IncomingMessage, res: ServerResponse): boolean {
    const path = req.url?.split("?")[0] ?? ""
    if (!path.startsWith("/api/")) return false
    const origin = req.headers.origin
    if (origin && ORIGINS.includes(origin)) {
        res.setHeader("access-control-allow-origin",
            origin)
        res.setHeader("vary",
            "origin")
        res.setHeader("access-control-allow-headers",
            "authorization, content-type")
        res.setHeader("access-control-allow-methods",
            "GET, POST, PATCH, DELETE, OPTIONS")
    }
    if (req.method === "OPTIONS") {
        res.writeHead(204)
        res.end()
        return true
    }
    route(req,
        path).then(([status,
        body]) => send(res,
        status,
        body)).catch((e: unknown) => {
        if (e instanceof HttpError) return send(res,
            e.status,
            {
                error: e.message
            })
        console.error("API lỗi",
            path,
            e)
        send(res,
            500,
            {
                error: "Lỗi máy chủ"
            })
    })
    return true
}
