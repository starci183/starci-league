// Từ khoá nhóm "d" (chép từ docs/heroes/TEXT_STYLE.md).
import type {
    Keyword
} from "./types"

/** Từ khoá nhóm d */
export const KEYWORDS_D: Record<string, Keyword> = {
    burn: {
        vi: "Bỏng",
        en: "Burn",
        descVi: "Dấu của Brand (tối đa 5, hết sau 2 lượt của tướng mang kể từ lần cộng cuối); gây sát thương đầu mỗi lượt của nó (xem Brand).",
        descEn: "Brand's mark (max 5, expires 2 of its bearer's turns after the last one added); deals damage at the start of each of its turns (see Brand)."
    },
    berserk: {
        vi: "Nổi Điên",
        en: "Berserk",
        descVi: "Trạng thái do Renata R gắn: tướng này vừa bị buộc đánh đồng đội của chính nó.",
        descEn: "Status from Renata R: this champion was forced to attack its own allies."
    }
}
