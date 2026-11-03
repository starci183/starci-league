// Điều hướng giữa các màn ngoài trận. App giữ phiên đăng nhập và kho lá, mỗi màn dựng vào một node gốc riêng.
import type {
    CardCatalog, DeckRow, Session
} from "../net/api"

export interface Nav {
    session: Session | null;
    catalog: CardCatalog | null;
    showAuth(message?: string): void;
    showDecks(message?: string): void;
    /** Mở màn xếp bộ: bộ có sẵn, hoặc null để tạo bộ mới từ bộ mặc định */
    showBuilder(deck: DeckRow | null): void;
    signedIn(session: Session): void;
    signOut(): void;
}
