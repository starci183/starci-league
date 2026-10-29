// Từ khoá nhóm "b" (agent phụ trách nhóm này điền vào).
import type {
    Keyword
} from "./types"

/** Từ khoá nhóm b */
export const KEYWORDS_B: Record<string, Keyword> = {
    mushroom: {
        vi: "Nấm Độc",
        en: "Toxic Mushroom",
        descVi: "Lá đặc biệt của Teemo nằm trong bộ bài đối thủ. Khi bị rút: Nấm nổ (xem Teemo) rồi biến mất, chiếm chỗ lá rút đó.",
        descEn: "Teemo's special card hidden in the opponent's deck. When drawn it explodes (see Teemo), then vanishes, taking the place of that draw."
    },
    pay_hp: {
        vi: "Trả Máu",
        en: "Pay HP",
        descVi: "Mất bấy nhiêu máu thẳng (không qua Khiên); không thể tự hạ mình (còn ít nhất 1 máu).",
        descEn: "Lose that much HP directly (ignores Shields); can't take yourself down (stays at 1 HP or more)."
    },
    keg: {
        vi: "Thùng Thuốc Súng",
        en: "Powder Keg",
        descVi: "Vật Triệu Hồi Úp của Gangplank (1 máu, tự xịt sau 3 lượt của bạn). Lá Úp theo nó là lá chiêu Gangplank thì là thùng thật, lá khác là thùng giả. Lá Úp vào mộ khi thùng nổ, vỡ hoặc xịt.",
        descEn: "Gangplank's Face-down Summon (1 HP, fizzles after 3 of your turns). If its attached card is a Gangplank skill card it is real, otherwise a fake. The card goes to the graveyard when the keg explodes, breaks or fizzles."
    },
    powder: {
        vi: "Thuốc Súng",
        en: "Powder",
        descVi: "Bộ đếm trên Thùng Thuốc Súng, +1 đầu mỗi lượt của bạn.",
        descEn: "Counter on the Powder Keg, +1 at the start of each of your turns."
    },
    keg_detonate: {
        vi: "Kích Nổ Thùng",
        en: "Detonate Keg",
        descVi: "Lật Thùng Thuốc Súng của bạn rồi gỡ nó: thùng thật gây sát thương lên mọi tướng địch (xem Gangplank Q), thùng giả không gây gì.",
        descEn: "Flip your Powder Keg and remove it: a real keg damages every enemy champion (see Gangplank Q), a fake does nothing."
    }
}
