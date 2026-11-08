// Chữ trạng thái, bộ đếm và từ khoá mới của nhóm Sát thủ: Katarina, Zed, Kha'Zix, Vayne (docs/heroes/KITS.md).
// Gộp vào i18n_en.ts (STATUS_V2, STACK_V2) và keywords/index.ts. Khoá trùng id cũ thì bản này ghi đè.
import type {
    Keyword
} from "../keywords/types"

type Txt = { name: string; desc: string }
type Bi = { vi: Txt; en: Txt }

/** Trạng thái (khoá = id status) */
export const STATUS_KITS_ASSASSIN: Record<string, Bi> = {
    zed_mark: {
        vi: {
            name: "Dấu Ấn Tử Thần", desc: "Cuối lượt này, Dấu Ấn nổ: sát thương chuẩn theo Máu đã mất của tướng này và số Liên Hoàn của Zed lúc đó, kể cả khi Zed đã bị hạ."
        },
        en: {
            name: "Death Mark", desc: "At the end of this turn the Mark detonates: true damage from this champion's missing HP and Zed's Chain Beats at that moment, even if Zed has been taken down."
        },
    },
    zed_q: {
        vi: {
            name: "Phi Tiêu Sắc Lẻm", desc: "Tới hết lượt này, mỗi đòn đánh của Zed gây thêm sát thương vật lý (số trên biểu tượng)."
        },
        en: {
            name: "Razor Shuriken", desc: "Until the end of this turn, each of Zed's attacks deals extra physical damage (the number on the icon)."
        },
    },
    isolated: {
        vi: {
            name: "Cô Lập", desc: "Trạng thái do Kha'Zix gắn, tồn tại theo đơn vị trên nội tại: đòn đánh của Kha'Zix lên tướng này gây thêm sát thương và Q của Kha'Zix gây thêm sát thương."
        },
        en: {
            name: "Isolated", desc: "A status Kha'Zix applies, lasting the number of units on his passive: Kha'Zix's attacks on this champion deal extra damage and his Q deals extra damage."
        },
    },
    vayne_r: {
        vi: {
            name: "Giờ Cuối", desc: "Tới hết lượt này, mỗi đòn đánh của Vayne gây thêm sát thương vật lý, mỗi đòn thứ 3 nổ thêm sát thương chuẩn (số trên biểu tượng là số đòn đã đánh)."
        },
        en: {
            name: "Final Hour", desc: "Until the end of this turn, each of Vayne's attacks deals extra physical damage and every 3rd attack explodes for extra true damage (the number on the icon is attacks made)."
        },
    },
}

/** Bộ đếm hiện trên tướng (khoá = key stack) */
export const STACK_KITS_ASSASSIN: Record<string, Bi> = {
    zed_chain: {
        vi: {
            name: "Liên Hoàn", desc: "Số chiêu và đòn Zed đã đánh trong lượt này. Mỗi tầng làm chiêu kế tiếp của Zed gây thêm sát thương. Hết lượt thì về 0."
        },
        en: {
            name: "Chain Beat", desc: "How many skills and attacks Zed has made this turn. Each stack makes Zed's next skill deal extra damage. Resets to 0 at the end of the turn."
        },
    },
    night: {
        vi: {
            name: "Bóng Đêm", desc: "Bộ đếm của Vayne, không có trần: mỗi tầng cho AD và Tốc Đánh. Nhận nhiều hơn khi Vayne chưa ra sân hoặc đang chờ hồi sinh. Khi Vayne bị hạ, mất một nửa."
        },
        en: {
            name: "Night", desc: "Vayne's uncapped counter: each stack gives AD and attack speed. Gained faster while Vayne is not on the board or is waiting to respawn. Halved when Vayne is taken down."
        },
    },
}

/** Từ khoá (khoá = id) */
export const KEYWORDS_KITS_ASSASSIN: Record<string, Keyword> = {
    zed_chain: {
        vi: "Liên Hoàn",
        en: "Chain Beat",
        descVi: "Nội tại của Zed: mỗi chiêu hoặc đòn đánh trong lượt cho 1 Liên Hoàn, hết lượt mất. Mỗi tầng làm chiêu kế tiếp của Zed gây thêm sát thương.",
        descEn: "Zed's passive: each skill or attack in a turn gives 1 Chain Beat, lost at the end of the turn. Each stack makes Zed's next skill deal extra damage.",
    },
    zed_mark: {
        vi: "Dấu Ấn Tử Thần",
        en: "Death Mark",
        descVi: "Dấu Zed gắn bằng R: cuối lượt đó nổ gây sát thương chuẩn theo Máu đã mất của tướng mang và số Liên Hoàn của Zed.",
        descEn: "A mark Zed puts on with R: at the end of that turn it detonates for true damage from the carrier's missing HP and Zed's Chain Beats.",
    },
    kat_dagger: {
        vi: "Dao",
        en: "Dagger",
        descVi: "Dấu mốc Katarina nhận đầu mỗi lượt của bạn và sau Q, nằm trên 1 đường phía bạn. Katarina vào đường có Dao thì nhặt, tướng địch đối diện nhận sát thương; E dịch chuyển tới đường có Dao, R cần đã nhặt Dao trong lượt.",
        descEn: "A lane marker Katarina gets at the start of each of your turns and after Q, lying on a lane on your side. Entering a lane with a Dagger picks it up and the enemy opposite takes damage; E teleports to a lane with a Dagger, R needs a Dagger picked up this turn.",
    },
    isolated: {
        vi: "Cô Lập",
        en: "Isolated",
        descVi: "Trạng thái chỉ Kha'Zix gắn (nội tại): đòn đánh và Q của Kha'Zix gây thêm sát thương lên tướng Cô Lập. Tung lên địch đối diện đầu lượt và mỗi lần Kha'Zix đổi đường; dễ trúng hơn nếu nó thiếu hiệu ứng có lợi hoặc đang chịu hiệu ứng bất lợi.",
        descEn: "A status only Kha'Zix applies (passive): Kha'Zix's attacks and Q deal extra damage to an Isolated champion. Thrown at the opposite enemy at turn start and each time Kha'Zix changes lane; likelier if it lacks beneficial effects or suffers harmful ones.",
    },
    night: {
        vi: "Bóng Đêm",
        en: "Night",
        descVi: "Bộ đếm của Vayne, không có trần: mỗi tầng cho AD và Tốc Đánh. Nhận nhiều hơn khi Vayne chưa ra sân. Mất một nửa khi Vayne bị hạ.",
        descEn: "Vayne's uncapped counter: each stack gives AD and attack speed. Gained faster while Vayne is off the board. Halved when Vayne is taken down.",
    },
}
