// Điều hướng giữa các màn. App giữ phiên đăng nhập và kho lá; màn trận (ghép, cấm/chọn, đấu, kết quả) do trạng thái
// phòng đấu (net/game.ts) quyết định, App tự chuyển màn theo stage.
import type {
    CardCatalog, DeckRow, Session
} from "../net/api"

/** Chế độ vào trận chọn ở sảnh */
export type MatchMode = { kind: "quick" } | { kind: "bot"; level: "easy" | "hard" } | { kind: "create" } | { kind: "join"; roomId: string }

export interface Nav {
    session: Session | null;
    catalog: CardCatalog | null;
    showAuth(message?: string): void;
    showLobby(message?: string): void;
    showDecks(message?: string): void;
    /** Mở màn xếp bộ: bộ có sẵn, hoặc null để tạo bộ mới từ bộ mặc định */
    showBuilder(deck: DeckRow | null): void;
    /** Vào trận theo chế độ đã chọn (mang bộ đang dùng) */
    startMatch(mode: MatchMode, deck: string[] | null, deckName?: string): void;
    /** Rời trận / huỷ ghép, về sảnh */
    leaveMatch(): void;
    signedIn(session: Session): void;
    signOut(): void;
}
