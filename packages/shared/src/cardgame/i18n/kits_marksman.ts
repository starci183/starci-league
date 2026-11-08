// Chữ trạng thái, bộ đếm và từ khoá của nhóm Xạ thủ (Ashe, Teemo, Tristana, Kog'Maw, Jinx).
// Gộp vào STATUS_V2 / STACK_V2 (i18n_en.ts) và KEYWORDS (keywords/index.ts) SAU các bảng cũ để ghi đè cùng id. Số lấy từ balance/heroes/*.json.
import type {
    Keyword
} from "../keywords/types"
import {
    kit
} from "../balance"

const ashe = kit("ashe").p, tri = kit("tristana").p, kog = kit("kogmaw").p, jinx = kit("jinx").p
const r = (x: number) => Math.round(x * 1000) / 1000

type Txt = { name: string; desc: string }
type Bi = { vi: Txt; en: Txt }

/** Trạng thái (khoá = id status) */
export const STATUS_KITS_MARKSMAN: Record<string, Bi> = {
    ashe_q: {
        vi: {
            name: "Tập Trung", desc: `Ashe nhận ${ashe.q1}% Tốc Đánh và mỗi đòn trúng gắn thêm ${ashe.q2} Buốt, trong ${ashe.q3} đơn vị.`
        },
        en: {
            name: "Ranger's Focus", desc: `Ashe gains ${ashe.q1}% attack speed and each hit applies ${ashe.q2} extra Frostbite, for ${ashe.q3} units.`
        },
    },
    tri_q: {
        vi: {
            name: "Bắn Nhanh", desc: "Tristana nhận Tốc Đánh trong thời hạn của chiêu (v = lượng Tốc Đánh)."
        },
        en: {
            name: "Rapid Fire", desc: "Tristana gains attack speed for the duration of the skill (v = attack speed)."
        },
    },
    kog_e: {
        vi: {
            name: "Cao Xạ Ma Pháp", desc: `Kog'Maw nhận ${kog.e2}% Tốc Đánh, đòn đánh tới mọi đường và mỗi đòn trúng gây thêm ${kog.e3}% Máu tối đa của mục tiêu.`
        },
        en: {
            name: "Magic Range", desc: `Kog'Maw gains ${kog.e2}% attack speed, his attacks reach every lane, and each hit deals ${kog.e3}% of the target's max HP extra.`
        },
    },
}

/** Bộ đếm (khoá = key stack). Buốt, Bom nằm trên địch (carrier stack); Đói, Điên, Súng nằm trên chính tướng. */
export const STACK_KITS_MARKSMAN: Record<string, Bi> = {
    frost: {
        vi: {
            name: "Buốt", desc: `Dấu của Ashe trên địch, vô hạn: mỗi Buốt làm nó chịu thêm ${ashe.p1}% sát thương từ phe Ashe (khi Ashe còn trên sân). Đạt ${ashe.p2} thì tiêu hết và bị Choáng. Tướng mang chết mất một nửa.`
        },
        en: {
            name: "Frostbite", desc: `Ashe's mark on an enemy, unlimited: each Frostbite makes it take ${ashe.p1}% more damage from Ashe's team (while Ashe is on the board). At ${ashe.p2} it is spent and the bearer is Stunned. The bearer dying halves it.`
        },
    },
    tri_bomb: {
        vi: {
            name: "Bom", desc: `Bom của Tristana trên địch, vô hạn. Nổ ${tri.p3} × n × (1 + n / ${tri.p4}) × (1 + ${r(tri.p5 * 100)}% AD) sát thương vật lý khi Tristana kích nổ (một lần mỗi lượt, không tốn lá) hoặc khi sát thương nổ đủ hạ mục tiêu. Tướng mang chết mất một nửa.`
        },
        en: {
            name: "Bomb", desc: `Tristana's Bomb on an enemy, unlimited. Explodes for ${tri.p3} × n × (1 + n / ${tri.p4}) × (1 + ${r(tri.p5 * 100)}% AD) physical damage when Tristana detonates it (once per turn, no card) or when the explosion would take the bearer down. The bearer dying halves it.`
        },
    },
    hunger: {
        vi: {
            name: "Đói", desc: `Bộ đếm của Kog'Maw, vô hạn, không mất khi chết. Mỗi Đói làm đòn trúng của Kog'Maw gây thêm ${kog.p3}% Máu tối đa của mục tiêu + ${kog.p4} + ${r(kog.p5 * 100)}% AD sát thương vật lý, không chí mạng.`
        },
        en: {
            name: "Hunger", desc: `Kog'Maw's counter, unlimited, not lost on death. Each Hunger makes Kog'Maw's hits deal an extra ${kog.p3}% of the target's max HP + ${kog.p4} + ${r(kog.p5 * 100)}% AD physical damage, which cannot crit.`
        },
    },
    frenzy: {
        vi: {
            name: "Điên", desc: `Bộ đếm của Jinx, vô hạn, mất một nửa khi Jinx chết. Mỗi Điên làm đòn trúng của Jinx gây thêm ${jinx.p4} + ${r(jinx.p5 * 100)}% AD sát thương vật lý, không chí mạng.`
        },
        en: {
            name: "Frenzy", desc: `Jinx's counter, unlimited, halved when Jinx dies. Each Frenzy makes Jinx's hits deal an extra ${jinx.p4} + ${r(jinx.p5 * 100)}% AD physical damage, which cannot crit.`
        },
    },
    jinx_gun: {
        vi: {
            name: "Súng", desc: `Súng Jinx đang cầm: 0 = Bằng Chíu (${jinx.q1}% Tốc Đánh), 1 = Xương Cá (đòn trúng nổ lan 2 đường kề). Chọn lúc ra sân, nút Tráo Hàng! dùng ở Standby.`
        },
        en: {
            name: "Gun", desc: `The gun Jinx holds: 0 = Pow-Pow (${jinx.q1}% attack speed), 1 = Fishbones (hits splash the 2 neighbouring lanes). Chosen on entering the board; the Switcheroo! button works in Standby.`
        },
    },
}

/** Từ khoá (khoá = id; tên hiển thị phải khác nhau trong bảng gộp) */
export const KEYWORDS_KITS_MARKSMAN: Record<string, Keyword> = {
    frost: {
        vi: "Buốt",
        en: "Frostbite",
        descVi: `Dấu của Ashe trên địch, vô hạn: mỗi Buốt làm nó chịu thêm ${ashe.p1}% sát thương từ phe Ashe. Đạt ${ashe.p2} thì tiêu hết và bị Choáng. Tướng mang chết mất một nửa.`,
        descEn: `Ashe's mark on an enemy, unlimited: each Frostbite makes it take ${ashe.p1}% more damage from Ashe's team. At ${ashe.p2} it is spent and the bearer is Stunned. The bearer dying halves it.`,
    },
    tri_bomb: {
        vi: "Bom",
        en: "Bomb",
        descVi: "Bom của Tristana trên địch, vô hạn. Tristana kích nổ một lần mỗi lượt không tốn lá, hoặc Bom tự nổ khi sát thương nổ đủ hạ mục tiêu. Tướng mang chết mất một nửa.",
        descEn: "Tristana's Bomb on an enemy, unlimited. Tristana detonates it once per turn with no card, or it goes off by itself when the explosion would take the bearer down. The bearer dying halves it.",
    },
    hunger: {
        vi: "Đói",
        en: "Hunger",
        descVi: `Bộ đếm của Kog'Maw, vô hạn, không mất khi chết; mỗi Đói làm đòn trúng gây thêm ${kog.p3}% Máu tối đa của mục tiêu + sát thương vật lý. Kog'Maw bị hạ nhận ${kog.p6} Đói.`,
        descEn: `Kog'Maw's counter, unlimited, not lost on death; each Hunger makes his hits deal ${kog.p3}% of the target's max HP + physical damage extra. Kog'Maw being taken down gives ${kog.p6} Hunger.`,
    },
    frenzy: {
        vi: "Điên",
        en: "Frenzy",
        descVi: "Bộ đếm của Jinx, vô hạn, mất một nửa khi Jinx chết; mỗi Điên làm đòn trúng gây thêm sát thương vật lý, không chí mạng.",
        descEn: "Jinx's counter, unlimited, halved when Jinx dies; each Frenzy makes her hits deal extra physical damage, which cannot crit.",
    },
    jinx_gun: {
        vi: "Súng Jinx",
        en: "Jinx's Gun",
        descVi: "Súng Jinx cầm khi ra sân: Bằng Chíu tăng Tốc Đánh, Xương Cá nổ lan 2 đường kề mục tiêu. Nút Tráo Hàng! dùng ở Standby.",
        descEn: "The gun Jinx holds on entering the board: Pow-Pow adds attack speed, Fishbones splashes the 2 lanes next to the target. The Standby button swaps it.",
    },
    mushroom: {
        vi: "Nấm",
        en: "Mushroom",
        descVi: "Lá đặc biệt Teemo xáo vào bộ bài đối thủ (không trần). Đối thủ rút trúng thì Nấm nổ sát thương vật lý lên tướng sống có tỉ lệ Máu thấp nhất của họ rồi biến mất; họ rút bù 1 lá.",
        descEn: "A special card Teemo shuffles into the opponent's deck (no cap). When the opponent draws it, it explodes for physical damage on their living champion with the lowest HP ratio and disappears; they draw 1 replacement card.",
    },
}
