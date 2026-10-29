// Bot chế độ thẻ bài. Hai mức:
// - "easy": tham lam 1 nước (botGreedy.ts): chấm sự kiện của từng hành động, chuỗi giải quyết bằng bỏ qua.
// - "hard": lập kế hoạch cả lượt bằng beam search + chấm thế cờ cuối lượt, không nhìn trộm thông tin ẩn (botSearch.ts).
// Cấm/chọn tướng: botDraft.ts.
import {
    chooseActionGreedy
} from "./botGreedy"
import {
    chooseActionSearch
} from "./botSearch"
import {
    actorsOf
} from "./engine"
import type {
    Action, GameState, Side
} from "./types"

export type BotLevel = "easy" | "hard";

/** Chọn 1 hành động cho `side` (side phải là bên đang được hỏi: lượt hiện tại, hoặc bên đang có quyền nối chuỗi). Tất định theo state. */
export function chooseAction(state: GameState, side: Side, level: BotLevel = "easy"): Action {
    return level === "hard" ? chooseActionSearch(state,
        side) : chooseActionGreedy(state,
        side)
}

/** Hỏi bên nào đang phải ra quyết định */
/** Bước gọi tướng úp (phase "blind"): cả hai phe cùng hành động, trả về phe chưa chốt đầu tiên (hỏi từng phe bằng actorsOf) */
export const whoseMove = (s: GameState): Side => (s.phase === "blind" ? actorsOf(s)[0] ?? s.active : s.phase === "chain" && s.chain ? s.chain.priority : s.active)
