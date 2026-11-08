// Xác thực người chơi khi vào phòng: client gửi token phiên (do /api/auth cấp), server kiểm chữ ký rồi đọc tên hiển thị
// và bộ bài đang dùng từ PostgreSQL.
import {
    deckError
} from "@starci/shared"
import {
    db
} from "./db"
import {
    verifyToken
} from "./session"

export interface Player {
  userId: string | null;
  name: string;
  /** Bộ bài đang dùng (đã kiểm tra hợp lệ), không có thì dùng bộ mặc định */
  deck: string[] | null;
}

/** Đọc token gửi lên khi vào phòng. Token sai thì ném lỗi (Colyseus từ chối vào phòng). */
export async function authenticate(token: string | undefined, guestName: string): Promise<Player> {
    if (!token) {
        if (process.env.REQUIRE_AUTH === "1") throw new Error("Cần đăng nhập để vào trận")
        return {
            userId: null, name: guestName, deck: null
        }
    }
    if (!db) throw new Error("Server chưa kết nối cơ sở dữ liệu")
    const userId = verifyToken(token)
    if (!userId) throw new Error("Phiên đăng nhập không hợp lệ, hãy đăng nhập lại")
    const [profile,
        deckRow] = await Promise.all([
        db.query<{ display_name: string; email: string }>(
            "select p.display_name, u.email from profiles p join users u on u.id = p.id where p.id = $1",
            [userId]),
        db.query<{ cards: string[] }>("select cards from decks where owner_id = $1 and is_active",
            [userId]),
    ])
    const p = profile.rows[0]
    if (!p) throw new Error("Tài khoản không còn tồn tại, hãy đăng nhập lại")
    const cards = deckRow.rows[0]?.cards
    const deck = cards && !deckError(cards) ? cards : null
    return {
        userId, name: p.display_name ?? p.email.split("@")[0] ?? "Người chơi", deck
    }
}
