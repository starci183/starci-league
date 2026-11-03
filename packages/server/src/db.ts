// Kết nối PostgreSQL (thay Supabase) và chạy migration trong db/migrations theo thứ tự tên file khi server khởi động.
import {
    readdir, readFile
} from "node:fs/promises"
import {
    dirname, join
} from "node:path"
import {
    fileURLToPath
} from "node:url"
import pg from "pg"

const url = process.env.DATABASE_URL
export const db = url ? new pg.Pool({
    connectionString: url
}) : null
if (!db) console.warn("Chưa cấu hình DATABASE_URL: chỉ vào được dạng khách")

const MIGRATIONS = join(dirname(fileURLToPath(import.meta.url)),
    "../../../db/migrations")

/** Chạy các migration chưa chạy, mỗi file một giao dịch */
export async function migrate(): Promise<void> {
    if (!db) return
    await db.query("create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())")
    const done = new Set((await db.query<{ name: string }>("select name from schema_migrations")).rows.map((r) => r.name))
    const files = (await readdir(MIGRATIONS)).filter((f) => f.endsWith(".sql")).sort()
    for (const file of files) {
        if (done.has(file)) continue
        const sql = await readFile(join(MIGRATIONS,
            file),
        "utf8")
        const client = await db.connect()
        try {
            await client.query("begin")
            await client.query(sql)
            await client.query("insert into schema_migrations (name) values ($1)",
                [file])
            await client.query("commit")
            console.log(`Đã chạy migration ${file}`)
        } catch (e) {
            await client.query("rollback")
            throw e
        } finally {
            client.release()
        }
    }
}
