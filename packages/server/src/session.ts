// Mật khẩu băm bằng scrypt, phiên đăng nhập là JWT HS256 ký bằng AUTH_SECRET. Chỉ dùng thư viện có sẵn của Node.
import {
    createHmac, randomBytes, scrypt, timingSafeEqual
} from "node:crypto"

const SCRYPT = {
    N: 16384, r: 8, p: 1
}
const KEY_LEN = 64
/** Phiên sống 30 ngày */
const TOKEN_TTL_S = 30 * 24 * 3600

const secret = process.env.AUTH_SECRET ?? (() => {
    console.warn("Chưa cấu hình AUTH_SECRET: dùng khoá tạm, phiên đăng nhập mất khi server khởi động lại")
    return randomBytes(32).toString("hex")
})()

function scryptKey(password: string, salt: Buffer, opts = SCRYPT): Promise<Buffer> {
    return new Promise((resolve, reject) => scrypt(password,
        salt,
        KEY_LEN,
        opts,
        (err, key) => (err ? reject(err) : resolve(key))))
}

/** "scrypt$N$r$p$<salt>$<hash>" (base64) */
export async function hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16)
    const key = await scryptKey(password,
        salt)
    return ["scrypt",
        SCRYPT.N,
        SCRYPT.r,
        SCRYPT.p,
        salt.toString("base64"),
        key.toString("base64")].join("$")
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
    const [kind,
        n,
        r,
        p,
        salt,
        hash] = stored.split("$")
    if (kind !== "scrypt" || !salt || !hash) return false
    const want = Buffer.from(hash,
        "base64")
    const got = await scryptKey(password,
        Buffer.from(salt,
            "base64"),
        {
            N: Number(n), r: Number(r), p: Number(p)
        })
    return got.length === want.length && timingSafeEqual(got,
        want)
}

const b64url = (data: Buffer | string) => Buffer.from(data).toString("base64url")
const sign = (body: string) => createHmac("sha256",
    secret).update(body).digest("base64url")

/** Token phiên cho một người dùng */
export function issueToken(userId: string): string {
    const now = Math.floor(Date.now() / 1000)
    const body = `${b64url(JSON.stringify({
        alg: "HS256", typ: "JWT"
    }))}.${b64url(JSON.stringify({
        sub: userId, iat: now, exp: now + TOKEN_TTL_S
    }))}`
    return `${body}.${sign(body)}`
}

/** Mã người dùng trong token, hoặc null nếu token sai chữ ký / hết hạn */
export function verifyToken(token: string): string | null {
    const [head,
        payload,
        sig] = token.split(".")
    if (!head || !payload || !sig) return null
    const want = Buffer.from(sign(`${head}.${payload}`))
    const got = Buffer.from(sig)
    if (got.length !== want.length || !timingSafeEqual(got,
        want)) return null
    try {
        const claims = JSON.parse(Buffer.from(payload,
            "base64url").toString("utf8")) as { sub?: unknown; exp?: unknown }
        if (typeof claims.sub !== "string" || typeof claims.exp !== "number") return null
        return claims.exp > Date.now() / 1000 ? claims.sub : null
    } catch {
        return null
    }
}
