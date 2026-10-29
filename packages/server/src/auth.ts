// Xác thực người chơi bằng Supabase: client gửi access token khi vào phòng, server hỏi Supabase token có thật không,
// rồi lấy tên hiển thị và bộ bài đang dùng. Khoá secret chỉ dùng ở đây (server), không bao giờ gửi xuống client.
import {
    createClient
} from "@supabase/supabase-js"
import {
    deckError
} from "@starci/shared"

export interface Player {
  userId: string | null;
  name: string;
  /** Bộ bài đang dùng (đã kiểm tra hợp lệ), không có thì dùng bộ mặc định */
  deck: string[] | null;
}

const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY
const admin = url && key ? createClient(url,
    key,
    {
        auth: {
            persistSession: false, autoRefreshToken: false
        }
    }) : null
if (!admin) console.warn("Chưa cấu hình SUPABASE_URL / SUPABASE_SECRET_KEY: chỉ vào được dạng khách")

/** Đọc token gửi lên khi vào phòng. Token sai thì ném lỗi (Colyseus từ chối vào phòng). */
export async function authenticate(token: string | undefined, guestName: string): Promise<Player> {
    if (!token) {
        if (process.env.REQUIRE_AUTH === "1") throw new Error("Cần đăng nhập để vào trận")
        return {
            userId: null, name: guestName, deck: null
        }
    }
    if (!admin) throw new Error("Server chưa kết nối Supabase")
    const { data, error } = await admin.auth.getUser(token)
    if (error || !data.user) throw new Error("Phiên đăng nhập không hợp lệ, hãy đăng nhập lại")
    const userId = data.user.id
    const [{ data: profile },
        { data: deckRow }] = await Promise.all([
        admin.from("profiles").select("display_name").eq("id",
            userId).maybeSingle(),
        admin.from("decks").select("cards").eq("owner_id",
            userId).eq("is_active",
            true).maybeSingle(),
    ])
    const deck = deckRow && !deckError(deckRow.cards) ? (deckRow.cards as string[]) : null
    return {
        userId, name: profile?.display_name ?? data.user.email?.split("@")[0] ?? "Người chơi", deck
    }
}
