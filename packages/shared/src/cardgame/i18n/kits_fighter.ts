// Chữ trạng thái, bộ đếm, từ khoá của nhóm Đấu sĩ (Gangplank, Darius, Aatrox, Yorick, Qiyana) theo bộ chiêu chốt 31/10 – 01/11/2026.
// Gộp: STATUS_KITS_FIGHTER vào STATUS_V2, STACK_KITS_FIGHTER vào STACK_V2 (i18n_en.ts), KEYWORDS_KITS_FIGHTER vào keywords/index.ts.
// Cùng id với bản cũ (bleed, keg, powder, keg_detonate, yorick_mist, qiyana_element) thì ghi đè, giữ nguyên tên hiển thị để từ khoá không trùng tên.
import type {
    Keyword
} from "../keywords/types"

type Txt = { name: string; desc: string }
type Bi = { vi: Txt; en: Txt }

/** Trạng thái (khoá = id status) */
export const STATUS_KITS_FIGHTER: Record<string, Bi> = {
    gp_wanted: {
        vi: {
            name: "Truy Nã", desc: "Gangplank đã đặt Truy Nã: mọi Thùng nổ trong hạn chỉ đánh tướng này, lá gì cũng nổ theo Thuốc Súng. Bị hạ trong hạn thì Gangplank nhận Vàng."
        },
        en: {
            name: "Wanted", desc: "Gangplank has placed a bounty: every Keg explosion while it lasts hits only this champion, whatever card the Keg holds. If it is taken down meanwhile, Gangplank gains Gold."
        },
    },
    bleed_t: {
        vi: {
            name: "Chảy Máu (đồng hồ)", desc: "Đồng hồ của Chảy Máu Darius trên tướng này (v = số tầng). Hết hạn thì mọi tầng biến mất."
        },
        en: {
            name: "Bleed (timer)", desc: "Timer of Darius's Bleed on this champion (v = stacks). When it runs out, every stack is gone."
        },
    },
    bleed: {
        vi: {
            name: "Chảy Máu", desc: "Dấu của Darius, cộng dồn không giới hạn, hết sau vài đơn vị kể từ lần cộng cuối. Đầu lượt tướng mang gây sát thương vật lý theo số tầng; Máy Chém Noxus tiêu hết thành sát thương chuẩn."
        },
        en: {
            name: "Bleed", desc: "Darius's mark, stacks without limit, expires some units after the last one was added. At the start of the carrier's turn it deals physical damage per stack; Noxian Guillotine burns them all as true damage."
        },
    },
}

/** Bộ đếm hiện trên tướng/token (khoá = stack key) */
export const STACK_KITS_FIGHTER: Record<string, Bi> = {
    bleed: {
        vi: {
            name: "Chảy Máu", desc: "Dấu của Darius nằm trên tướng mang, không giới hạn. Đầu lượt tướng mang gây sát thương theo số tầng. Hết hạn khi đồng hồ hết; tướng mang chết mất một nửa."
        },
        en: {
            name: "Bleed", desc: "Darius's marks on the carrier, no limit. At the start of the carrier's turn they deal damage per stack. They expire when the timer runs out; the carrier loses half when it dies."
        },
    },
    yorick_soul: {
        vi: {
            name: "Hồn Ma", desc: "Mỗi đòn trúng cho 1 Hồn Ma, không giới hạn. Mỗi tầng cho Máu tối đa và Giáp; mỗi bội số cố định tạo 1 lá R. Yorick chết mất một nửa."
        },
        en: {
            name: "Wraith", desc: "Each hit gives 1 Wraith, no limit. Each stack gives max HP and Armor; at every fixed multiple you create 1 R card. Yorick loses half when he dies."
        },
    },
    mist_evo: {
        vi: {
            name: "Tiến Hoá Ma Sương", desc: "Gọi Ma Sương khi nó đã có thì được 1 tầng: thêm Máu, Giáp và sát thương cho Ma Sương. Mất khi Ma Sương mất."
        },
        en: {
            name: "Mist Evolution", desc: "Casting R while the Mist Walker is out gives it 1 stack: more HP, Armor and damage. Lost with the Mist Walker."
        },
    },
    element: {
        vi: {
            name: "Nguyên Tố", desc: "Nguyên tố của đường Qiyana đang đứng (1 Đất, 2 Nước, 3 Cỏ), công khai. Áp cho chiêu kế của cô."
        },
        en: {
            name: "Element", desc: "The element of the lane Qiyana stands on (1 Earth, 2 Water, 3 Grass), public. It applies to her next skill."
        },
    },
}

/** Từ khoá (khoá = id) */
export const KEYWORDS_KITS_FIGHTER: Record<string, Keyword> = {
    keg: {
        vi: "Thùng",
        en: "Keg",
        descVi: "Thùng của Gangplank: vật triệu hồi úp ở ô phụ, 1 Máu, tối đa 1; mọi vai địch đánh được. Úp từ một lá trên tay (nút Úp Lá, 0 Thuốc Súng) hoặc từ chính lá E (3 Thuốc Súng). Vỡ hoặc nổ thì lật: lá chiêu nổ theo Thuốc Súng, Vàng cho 2 lá Vàng, đồ về tay, lá khác hồi máu.",
        descEn: "Gangplank's Keg: a face-down summon in the extra slot, 1 HP, max 1; every enemy role can attack it. Stashed from a hand card (Stash button, 0 Powder) or from the E card itself (3 Powder). When it breaks or explodes it flips: a skill card explodes by Powder, Gold gives 2 Gold cards, an item returns to hand, any other card heals.",
    },
    powder: {
        vi: "Thuốc Súng",
        en: "Powder",
        descVi: "Bộ đếm bí mật trên Thùng của Gangplank: +1 đầu mỗi lượt của bạn, không giới hạn. Thùng nổ gây sát thương tăng vọt theo Thuốc Súng. Lộ ra khi Thùng lật.",
        descEn: "A hidden counter on Gangplank's Keg: +1 at the start of each of your turns, no cap. An exploding Keg deals escalating damage per Powder. Revealed when the Keg flips.",
    },
    keg_detonate: {
        vi: "Kích Nổ",
        en: "Detonate",
        descVi: "Thùng của Gangplank nổ: lá chiêu bên trong nổ theo Thuốc Súng. Địch phá thì chỉ kẻ phá nhận sát thương; Gangplank tự kích thì mọi tướng địch nhận.",
        descEn: "Gangplank's Keg explodes: a skill card inside explodes by Powder. If an enemy broke it only the breaker takes the damage; if Gangplank detonates it every enemy champion does.",
    },
    gp_wanted: {
        vi: "Truy Nã",
        en: "Wanted",
        descVi: "Gangplank đặt lên 1 tướng địch bằng R: mọi Thùng nổ trong hạn chỉ đánh tướng này, lá gì cũng nổ theo Thuốc Súng. Nó bị hạ trong hạn thì Gangplank nhận Vàng.",
        descEn: "Placed on 1 enemy champion by Gangplank's R: every Keg explosion while it lasts hits only this champion, whatever card the Keg holds. If it is taken down meanwhile, Gangplank gains Gold.",
    },
    bleed: {
        vi: "Chảy Máu",
        en: "Bleed",
        descVi: "Dấu của Darius trên tướng mang, cộng dồn không giới hạn, hết sau vài đơn vị kể từ lần cộng cuối. Đầu lượt tướng mang gây sát thương vật lý theo số tầng. Tướng mang chết mất một nửa.",
        descEn: "Darius's mark on the carrier, stacks without limit, expires some units after the last one was added. At the start of the carrier's turn it deals physical damage per stack. The carrier loses half when it dies.",
    },
    yorick_soul: {
        vi: "Hồn Ma",
        en: "Wraith",
        descVi: "Bộ đếm của Yorick: mỗi đòn trúng cho 1 Hồn Ma, không giới hạn. Mỗi tầng cho Máu tối đa và Giáp; mỗi bội số cố định tạo 1 lá R. Yorick chết mất một nửa.",
        descEn: "Yorick's counter: each hit gives 1 Wraith, no limit. Each stack gives max HP and Armor; at every fixed multiple you create 1 R card. Yorick loses half when he dies.",
    },
    yorick_mist: {
        vi: "Ma Sương",
        en: "Mist Walker",
        descVi: "Vật triệu hồi của Yorick ở ô phụ (Máu và Giáp theo Yorick). Đầu lượt bạn và mỗi đòn của Yorick, nó đánh tướng đối diện rồi đốt bài đối thủ. Gọi lại khi đã có thì hồi đầy và Tiến Hoá. Yorick chết thì biến mất.",
        descEn: "Yorick's summon in the extra slot (HP and Armor from Yorick). At the start of your turn and with each of Yorick's hits it strikes the opposite enemy and burns the opponent's deck. Casting R again heals it fully and evolves it. It vanishes when Yorick dies.",
    },
    qiyana_element: {
        vi: "Nguyên Tố",
        en: "Element",
        descVi: "Đầu trận 5 đường mang Nguyên Tố công khai ngẫu nhiên (Đất, Nước, Cỏ). Qiyana hấp thụ nguyên tố đường đang đứng và áp cho chiêu kế: Đất thêm sát thương, Nước Choáng, Cỏ Tàng Hình.",
        descEn: "At the start of the game the 5 lanes carry public random Elements (Earth, Water, Grass). Qiyana absorbs the element of the lane she stands on and applies it to her next skill: Earth adds damage, Water Stuns, Grass grants Stealth.",
    },
}
