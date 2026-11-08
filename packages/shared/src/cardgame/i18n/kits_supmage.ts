// Chữ cho trạng thái, bộ đếm và từ khoá của nhóm Trợ thủ + Pháp sư (Nami, Renata, Janna, Soraka, Brand, Ahri, Annie).
// Gộp vào STATUS_V2 / STACK_V2 (i18n_en.ts) và KEYWORDS (keywords/index.ts) SAU các bảng V2, nên ghi đè khoá cũ cùng id (burn, fire, ahri_charm, tibbers, renata_rev).
import type {
    Keyword
} from "../keywords/types"

type Txt = { name: string; desc: string }
type Bi = { vi: Txt; en: Txt }

/** Trạng thái (khoá = id status) */
export const STATUS_KITS_SUPMAGE: Record<string, Bi> = {
    vulnerable: {
        vi: {
            name: "Dễ Tổn Thương", desc: "Tướng này nhận thêm sát thương (số trên biểu tượng) trong thời hạn của trạng thái (Nami R)."
        },
        en: {
            name: "Vulnerable", desc: "This champion takes extra damage (the number on the icon) for the duration of the status (Nami R)."
        },
    },
    madness: {
        vi: {
            name: "Cuồng Loạn", desc: "Renata R: tướng này được thêm Tốc Đánh và vừa bị buộc tự đánh mục tiêu gần nhất theo ưu tiên đồng minh của nó, trung lập, tướng phe Renata, Renata."
        },
        en: {
            name: "Madness", desc: "Renata R: this champion gained Attack Speed and was forced to attack the nearest target in the order its own allies, neutral, Renata's team, Renata."
        },
    },
    renata_q: {
        vi: {
            name: "Cứu Cánh", desc: "Renata Q: đòn đánh của tướng này gây thêm một phần lượng Máu đã mất của chính nó (số trên biểu tượng là hệ số)."
        },
        en: {
            name: "Lifeline", desc: "Renata Q: this champion's attacks deal extra damage equal to a share of its own missing HP (the number on the icon is the ratio)."
        },
    },
    shield_power: {
        vi: {
            name: "Mắt Bão", desc: "Janna E: tăng AD và AP bằng một phần Khiên đang có (số trên biểu tượng là hệ số). Mất khi Khiên vỡ."
        },
        en: {
            name: "Eye of the Storm", desc: "Janna E: increases AD and AP by a share of the current Shield (the number on the icon is the ratio). Lost when the Shield breaks."
        },
    },
    ahri_charm: {
        vi: {
            name: "Say Mê", desc: "Ahri R: không hết hạn, tối đa 1 tầng, mất khi tướng này bị hạ. Khi Ahri còn trên sân, Ahri gây thêm sát thương lên tướng này và tướng này gây ít sát thương hơn lên Ahri."
        },
        en: {
            name: "Charm", desc: "Ahri R: never expires, 1 stack at most, lost when this champion is taken down. While Ahri is on the board she deals extra damage to this champion and it deals less damage to her."
        },
    },
}

/** Bộ đếm (khoá = key stack) */
export const STACK_KITS_SUPMAGE: Record<string, Bi> = {
    nami_wave: {
        vi: {
            name: "Dậy Sóng", desc: "Bộ đếm của Nami, cộng dồn vô hạn. Mỗi Dậy Sóng cho mọi đồng minh thêm AP; đạt bội số 20 thì rút 1 lá. Mất một nửa khi Nami bị hạ; khi Nami đang chết, tầng giữ nhưng phần AP tắt."
        },
        en: {
            name: "Surging Tide", desc: "Nami's counter, stacking without limit. Each Surging Tide gives every ally extra AP; reaching a multiple of 20 draws 1 card. Half is lost when Nami is taken down; while she is dead the stacks stay but the AP is off."
        },
    },
    nami_bless: {
        vi: {
            name: "Phước Lành", desc: "Của Nami, trên tướng mang, cộng dồn vô hạn. Mỗi khi lá chiêu của tướng mang gây sát thương lên địch, tiêu 1; mỗi tướng địch trúng chịu thêm sát thương theo AD/AP của tướng mang. Không hết hạn, không mất khi tướng mang bị hạ."
        },
        en: {
            name: "Blessing", desc: "Nami's, on the bearer, stacking without limit. Whenever the bearer's skill card damages an enemy, spend 1; each enemy champion hit takes extra damage based on the bearer's AD/AP. Never expires, kept when the bearer is taken down."
        },
    },
    renata_rev: {
        vi: {
            name: "Đã Cứu Trợ", desc: "Tướng này đã được Cấp Vốn của Renata cứu 1 lần trong trận; không được cứu lại."
        },
        en: {
            name: "Bailed Out", desc: "This champion has already been saved once this match by Renata's Leverage; it cannot be saved again."
        },
    },
    soraka_light: {
        vi: {
            name: "Thánh Quang", desc: "Bộ đếm của Soraka, cộng dồn vô hạn: mỗi tầng tăng hồi Máu nhận vào của mọi tướng mình. Mất một nửa khi Soraka bị hạ."
        },
        en: {
            name: "Starlight", desc: "Soraka's counter, stacking without limit: each stack increases the healing all your champions receive. Half is lost when Soraka is taken down."
        },
    },
    janna_wind: {
        vi: {
            name: "Gió Thuận", desc: "Bộ đếm của Janna, cộng dồn vô hạn: mỗi tầng tăng Khiên mới của tướng mình và cho tướng mình còn Khiên thêm Tốc Đánh. Mất một nửa khi Janna bị hạ."
        },
        en: {
            name: "Tailwind", desc: "Janna's counter, stacking without limit: each stack makes new Shields on your champions bigger and gives shielded champions extra Attack Speed. Half is lost when Janna is taken down."
        },
    },
    burn: {
        vi: {
            name: "Bỏng", desc: "Bộ đếm Brand đặt trên tướng địch, cộng dồn không trần, không hết hạn. Đầu lượt tướng mang, mỗi Bỏng gây một phần Máu hiện tại và Máu tối đa của nó thành sát thương phép, kể cả khi Brand đã chết. Tướng mang bị hạ mất một nửa."
        },
        en: {
            name: "Burn", desc: "A counter Brand places on enemy champions, stacking without cap, never expiring. At the start of its bearer's turn each Burn deals a share of its current and max HP as magic damage, even if Brand is dead. Half is lost when the bearer is taken down."
        },
    },
    ahri_essence: {
        vi: {
            name: "Tinh Hoa", desc: "Bộ đếm của Ahri, cộng dồn vô hạn: mỗi đánh thường, mỗi chiêu và mỗi lần đổi chỗ +1. Mỗi tầng tăng sát thương Q, E, R, đòn thường và Tốc Đánh. Mất một nửa khi Ahri bị hạ."
        },
        en: {
            name: "Essence", desc: "Ahri's counter, stacking without limit: +1 per basic attack, skill and swap. Each stack increases the damage of Q, E, R, basic attacks and Attack Speed. Half is lost when Ahri is taken down."
        },
    },
    fire: {
        vi: {
            name: "Lửa", desc: "Bộ đếm của Annie, tối đa 4: mỗi chiêu +1. Đủ 4 thì chiêu kế tiêu hết và Choáng mọi địch trúng. Mất một nửa khi Annie bị hạ."
        },
        en: {
            name: "Fire", desc: "Annie's counter, max 4: +1 per skill. At 4 the next skill spends all of it and Stuns every enemy it hits. Half is lost when Annie is taken down."
        },
    },
}

/** Từ khoá (khoá = id status/stack). Tên hiển thị không trùng nhau trong bảng gộp. */
export const KEYWORDS_KITS_SUPMAGE: Record<string, Keyword> = {
    nami_wave: {
        vi: "Dậy Sóng",
        en: "Surging Tide",
        descVi: "Bộ đếm của Nami: sát thương phe gây lên tướng địch đủ ngưỡng thì +1, cộng dồn vô hạn. Mỗi tầng cho mọi đồng minh thêm AP; đạt bội số 20 thì rút 1 lá. Mất một nửa khi Nami bị hạ (xem Nami).",
        descEn: "Nami's counter: +1 each time team damage to enemy champions reaches the threshold, stacking without limit. Each stack gives every ally extra AP; reaching a multiple of 20 draws 1 card. Half is lost when Nami is taken down (see Nami).",
    },
    nami_bless: {
        vi: "Phước Lành",
        en: "Blessing",
        descVi: "Của Nami, trên tướng mang: lá chiêu của tướng mang gây sát thương lên địch tiêu 1, mỗi tướng địch trúng chịu thêm sát thương theo AD/AP của tướng mang. Không hết hạn (xem Nami).",
        descEn: "Nami's, on the bearer: when the bearer's skill card damages an enemy it spends 1, and each enemy champion hit takes extra damage based on the bearer's AD/AP. Never expires (see Nami).",
    },
    vulnerable: {
        vi: "Dễ Tổn Thương",
        en: "Vulnerable",
        descVi: "Nhận thêm một phần sát thương trong thời hạn của trạng thái (xem Nami).",
        descEn: "Takes a share of extra damage for the duration of the status (see Nami).",
    },
    madness: {
        vi: "Cuồng Loạn",
        en: "Madness",
        descVi: "Renata R: thêm Tốc Đánh và buộc tự đánh mục tiêu gần nhất theo ưu tiên đồng minh của nó, trung lập, tướng phe Renata, Renata (xem Renata).",
        descEn: "Renata R: extra Attack Speed and forced to attack the nearest target in the order its own allies, neutral, Renata's team, Renata (see Renata).",
    },
    soraka_light: {
        vi: "Thánh Quang",
        en: "Starlight",
        descVi: "Bộ đếm của Soraka, cộng dồn vô hạn khi phe được hồi đủ Máu: mỗi tầng tăng hồi Máu nhận vào của mọi tướng mình. Mất một nửa khi Soraka bị hạ (xem Soraka).",
        descEn: "Soraka's counter, stacking without limit as your team is healed: each stack increases the healing all your champions receive. Half is lost when Soraka is taken down (see Soraka).",
    },
    janna_wind: {
        vi: "Gió Thuận",
        en: "Tailwind",
        descVi: "Bộ đếm của Janna, cộng dồn vô hạn khi phe nhận đủ Khiên: mỗi tầng tăng Khiên mới và cho tướng còn Khiên thêm Tốc Đánh. Mất một nửa khi Janna bị hạ (xem Janna).",
        descEn: "Janna's counter, stacking without limit as your team receives Shield: each stack makes new Shields bigger and gives shielded champions extra Attack Speed. Half is lost when Janna is taken down (see Janna).",
    },
    shield_power: {
        vi: "Mắt Bão",
        en: "Eye of the Storm",
        descVi: "Tăng AD và AP bằng một phần Khiên đang có; mất khi Khiên vỡ (xem Janna).",
        descEn: "Increases AD and AP by a share of the current Shield; lost when the Shield breaks (see Janna).",
    },
    burn: {
        vi: "Bỏng",
        en: "Burn",
        descVi: "Bộ đếm Brand đặt trên tướng địch, cộng dồn không trần, không hết hạn; đầu lượt tướng mang, mỗi Bỏng gây sát thương phép theo Máu hiện tại và Máu tối đa của nó, kể cả khi Brand đã chết. Tướng mang bị hạ mất một nửa (xem Brand).",
        descEn: "A counter Brand places on enemy champions, stacking without cap, never expiring; at the start of its bearer's turn each Burn deals magic damage based on its current and max HP, even if Brand is dead. Half is lost when the bearer is taken down (see Brand).",
    },
    ahri_essence: {
        vi: "Tinh Hoa",
        en: "Essence",
        descVi: "Bộ đếm của Ahri, cộng dồn vô hạn: mỗi đánh thường, chiêu và lần đổi chỗ +1; mỗi tầng tăng sát thương chiêu, đòn thường và Tốc Đánh. Mất một nửa khi Ahri bị hạ (xem Ahri).",
        descEn: "Ahri's counter, stacking without limit: +1 per basic attack, skill and swap; each stack increases skill damage, basic attack damage and Attack Speed. Half is lost when Ahri is taken down (see Ahri).",
    },
    ahri_charm: {
        vi: "Say Mê",
        en: "Charm",
        descVi: "Dấu của Ahri R, không hết hạn, tối đa 1 tầng, mất khi tướng mang bị hạ: Ahri gây thêm sát thương lên nó và nó gây ít sát thương hơn lên Ahri (xem Ahri).",
        descEn: "Mark from Ahri R, never expires, 1 stack at most, lost when the bearer is taken down: Ahri deals extra damage to it and it deals less damage to Ahri (see Ahri).",
    },
    fire: {
        vi: "Lửa",
        en: "Fire",
        descVi: "Bộ đếm của Annie, tối đa 4; đủ 4 thì chiêu kế tiêu hết và Choáng mọi địch trúng (xem Annie).",
        descEn: "Annie's counter, max 4; at 4 the next skill spends all of it and Stuns every enemy it hits (see Annie).",
    },
    tibbers: {
        vi: "Tibbers",
        en: "Tibbers",
        descVi: "Con gấu của Annie ở ô phụ: Máu, Giáp, Kháng, sát thương theo AP và Máu tối đa của Annie; cuối lượt Annie đánh 1 tướng địch. Annie bị hạ thì biến mất (xem Annie).",
        descEn: "Annie's bear in the auxiliary slot: HP, Armor, MR and damage from Annie's AP and max HP; at the end of Annie's turn it attacks 1 enemy champion. Disappears if Annie is taken down (see Annie).",
    },
}
