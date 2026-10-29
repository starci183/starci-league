// CẤM / CHỌN trước trận (kiểu LoL): mỗi bên cấm 2 tướng, rồi chọn xen kẽ "rắn" A · B B · A A · ... tới khi mỗi bên đủ ROSTER_SIZE tướng.
// Đội tướng chọn được chính là Đội Hình mang vào trận.
import {
    ROSTER_SIZE, type Side
} from "./cards"

export type DraftAction = "ban" | "pick";
export const DRAFT_BANS = 2

const snake = (n: number): Side[] => Array.from({
    length: n * 2
},
(_, i) => (Math.floor((i + 1) / 2) % 2 === 0 ? "A" : "B"))
/** Thứ tự cấm/chọn: 4 lượt cấm xen kẽ, rồi 14 lượt chọn kiểu rắn */
export const DRAFT_ORDER: { side: Side; action: DraftAction }[] = [
    ...Array.from({
        length: DRAFT_BANS * 2
    },
    (_, i) => ({
        side: (i % 2 === 0 ? "A" : "B") as Side, action: "ban" as const
    })),
    ...snake(ROSTER_SIZE).map((side) => ({
        side, action: "pick" as const
    })),
]

export interface DraftLike { draftStep: number; bans: ArrayLike<string>; picksA: ArrayLike<string>; picksB: ArrayLike<string> }
const has = (xs: ArrayLike<string>, id: string) => Array.from(xs).includes(id)
/** Tướng còn cấm / chọn được */
export const draftTaken = (d: DraftLike, id: string) => has(d.bans,
    id) || has(d.picksA,
    id) || has(d.picksB,
    id)
/** Lượt cấm/chọn hiện tại (undefined khi đã xong) */
export const draftTurn = (d: DraftLike) => DRAFT_ORDER[d.draftStep]
