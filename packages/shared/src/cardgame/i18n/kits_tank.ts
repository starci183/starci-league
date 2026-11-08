// Chữ cho trạng thái, bộ đếm và từ khoá của nhóm Đỡ đòn (Braum, Leona, Malphite, Blitzcrank, Ornn) và Garen.
// Gộp vào STATUS_V2 / STACK_V2 (i18n_en.ts) và KEYWORDS (keywords/index.ts) SAU các bảng V2, nên ghi đè khoá cũ cùng id (braum_dual, braum_mark, blitz_steal).
import type {
    Keyword
} from "../keywords/types"

type Txt = { name: string; desc: string }
type Bi = { vi: Txt; en: Txt }

/** Trạng thái mới (khoá = id status) */
export const STATUS_KITS_TANK: Record<string, Bi> = {
    stone_link: {
        vi: {
            name: "Liên Kết Đá", desc: "Malphite nối tướng này với các tướng liên kết khác, không hết hạn: sát thương địch lên 1 tướng liên kết được chia đều cho mọi tướng liên kết (sát thương cả phe không chia). Mất khi Malphite hoặc tướng này bị hạ."
        },
        en: {
            name: "Stone Link", desc: "Malphite bound this champion to the other linked champions, never expires: damage an enemy deals to 1 linked champion is split equally among all linked champions (team-wide damage is not split). Lost when Malphite or this champion is taken down."
        },
    },
}

/** Bộ đếm (khoá = key stack) */
export const STACK_KITS_TANK: Record<string, Bi> = {
    braum_dual: {
        vi: {
            name: "Song Giáp", desc: "Bộ đếm của Braum, cộng dồn vô hạn. Mỗi Song Giáp tăng Giáp và Kháng phép. Mất một nửa khi Braum bị hạ."
        },
        en: {
            name: "Twin Armor", desc: "Braum's counter, stacking without limit. Each Twin Armor adds Armor and MR. Half is lost when Braum is taken down."
        },
    },
    blitz_parts: {
        vi: {
            name: "Phụ Tùng", desc: "Bộ đếm của Blitzcrank: mỗi lần cướp 1 lá được 1 Phụ Tùng, vô hạn. Mỗi Phụ Tùng tăng Giáp và Kháng phép. Mất một nửa khi Blitzcrank bị hạ."
        },
        en: {
            name: "Parts", desc: "Blitzcrank's counter: +1 for every card he steals, without limit. Each Part adds Armor and MR. Half is lost when Blitzcrank is taken down."
        },
    },
    garen_steel: {
        vi: {
            name: "Kiên Cường", desc: "Bộ đếm của Garen: mỗi đòn đánh thường trúng thêm 1 tầng, vô hạn. Mỗi tầng tăng Giáp. Mất một nửa khi Garen bị hạ."
        },
        en: {
            name: "Perseverance", desc: "Garen's counter: +1 for every attack that hits, without limit. Each stack adds Armor. Half is lost when Garen is taken down."
        },
    },
    ornn_mw: {
        vi: {
            name: "Kiệt Tác", desc: "Ornn rèn lên đồ của tướng này. Mỗi tầng tăng % chỉ số đồ (hiện ở mục Kiệt Tác %). Không mất khi tướng bị hạ (quyết định tạm, chờ thầy chốt)."
        },
        en: {
            name: "Masterwork", desc: "Ornn forged this champion's items. Each stack adds a % to item stats (shown as the Masterwork % below). Not lost when the champion is taken down (temporary decision)."
        },
    },
    itemAmp: {
        vi: {
            name: "Kiệt Tác %", desc: "Chỉ số của đồ (và mọi chỉ số tướng này đang có) tăng bằng số % này, nhờ Kiệt Tác của Ornn."
        },
        en: {
            name: "Masterwork %", desc: "This champion's stats are increased by this %, thanks to Ornn's Masterwork."
        },
    },
}

/** Từ khoá (khoá = id, tên hiển thị duy nhất trong bảng gộp) */
export const KEYWORDS_KITS_TANK: Record<string, Keyword> = {
    braum_dual: {
        vi: "Song Giáp",
        en: "Twin Armor",
        descVi: "Bộ đếm của Braum, cộng dồn vô hạn: đòn đánh thường của địch trúng Braum cho Song Giáp. Mỗi Song Giáp tăng Giáp và Kháng phép. Mất một nửa khi Braum bị hạ.",
        descEn: "Braum's counter, stacking without limit: enemy attacks that hit Braum give Twin Armor. Each Twin Armor adds Armor and MR. Half is lost when Braum is taken down.",
    },
    braum_mark: {
        vi: "Dấu Băng",
        en: "Frost Mark",
        descVi: "Dấu của Braum trên địch, tồn tại theo số đơn vị ghi trên Q. Đồng minh khác Braum đánh trúng: tiêu dấu, tướng bị đánh Choáng và Braum nhận Song Giáp.",
        descEn: "Braum's mark on an enemy, lasting the number of units written on Q. When an ally other than Braum hits it: the mark is consumed, the champion is Stunned and Braum gains Twin Armor.",
    },
    stone_link: {
        vi: "Liên Kết Đá",
        en: "Stone Link",
        descVi: "Malphite nối các tướng, không hết hạn: sát thương địch lên 1 tướng liên kết được chia đều cho mọi tướng liên kết, sát thương cả phe không chia.",
        descEn: "Malphite binds champions, never expires: damage an enemy deals to 1 linked champion is split equally among all linked champions, team-wide damage is not split.",
    },
    blitz_parts: {
        vi: "Phụ Tùng",
        en: "Parts",
        descVi: "Bộ đếm của Blitzcrank: mỗi lần cướp 1 lá được 1 Phụ Tùng. Mỗi Phụ Tùng tăng Giáp và Kháng phép. Mất một nửa khi bị hạ.",
        descEn: "Blitzcrank's counter: +1 for every stolen card. Each Part adds Armor and MR. Half is lost when he is taken down.",
    },
    blitz_steal: {
        vi: "Cướp Bài",
        en: "Card-Steal",
        descVi: "Lấy 1 lá của đối thủ. Lá thường giữ nguyên; lá chiêu của địch vào mộ chủ lá, thay bằng 1 lá Q hoặc E ngẫu nhiên của tướng mình trên sân.",
        descEn: "Take 1 card from the opponent. An ordinary card stays as it is; an enemy skill card goes to its owner's graveyard and is replaced by a random Q or E card of one of your champions on the board.",
    },
    garen_steel: {
        vi: "Kiên Cường",
        en: "Perseverance",
        descVi: "Bộ đếm của Garen: mỗi đòn đánh thường trúng thêm 1 tầng. Mỗi tầng tăng Giáp. Mất một nửa khi bị hạ.",
        descEn: "Garen's counter: +1 for every attack that hits. Each stack adds Armor. Half is lost when he is taken down.",
    },
    ornn_mw: {
        vi: "Kiệt Tác",
        en: "Masterwork",
        descVi: "Ornn rèn lên đồ của một tướng. Mỗi tầng tăng % chỉ số đồ. Không mất khi tướng giữ đồ bị hạ (quyết định tạm, chờ thầy chốt).",
        descEn: "Ornn forges a champion's items. Each stack adds a % to item stats. Not lost when the holder is taken down (temporary decision, pending the teacher's ruling).",
    },
}
