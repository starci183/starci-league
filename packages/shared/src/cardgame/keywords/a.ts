// Từ khoá nhóm "a" (chép từ docs/heroes/TEXT_STYLE.md).
import type {
    Keyword
} from "./types"

/** Từ khoá nhóm a */
export const KEYWORDS_A: Record<string, Keyword> = {
    bleed: {
        vi: "Chảy Máu",
        en: "Bleed",
        descVi: "Dấu của Darius trên tướng (tối đa 5, hết sau 2 lượt của tướng mang kể từ lần cộng cuối).",
        descEn: "Darius's mark (max 5, expires 2 of its turns after the last one added)."
    },
    execute: {
        vi: "Kết Liễu",
        en: "Execute",
        descVi: "Gây sát thương chuẩn đủ hạ tướng đó ngay (Khiên không cứu được; hiệu ứng \"không bị hạ\" vẫn áp dụng).",
        descEn: "Deal enough true damage to take it down at once (Shields don't save it; \"can't be taken down\" effects still apply)."
    },
    braum_cover: {
        vi: "Đỡ Thay",
        en: "Intercept",
        descVi: "Lá hoặc đòn đánh của địch đổi mục tiêu sang Braum.",
        descEn: "The enemy card or attack is redirected to Braum."
    },
}
